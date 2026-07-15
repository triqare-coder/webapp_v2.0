// SOS → push domain logic: classify a status transition into an event, work out
// who needs to hear about it, and send.
//
// Every SOS write path in the system (patient app, driver app, ER-team dashboard,
// timeout reaper) lands here via the notify_push_on_sos_change DB trigger, so this
// is the single definition of "what gets a push".

import { createClient } from '@/lib/supabase/server'
import { sendToTokens, type PushPayload } from './fcm'

/** Matches the driver app's fallback in app/(driver)/index.tsx. */
const DEFAULT_RADIUS_KM = 30

export interface SOSTransition {
  requestId: string
  /** null on create. */
  oldStatus: string | null
  newStatus: string
  oldDriverId: string | null
  newDriverId: string | null
}

export type SOSPushEvent =
  | 'sos.created'
  | 'sos.accepted'
  | 'sos.transport_arrived'
  | 'sos.no_driver'
  | 'sos.cancelled'

export interface DispatchResult {
  event: SOSPushEvent | null
  recipients: number
  sent: number
  failed: number
}

interface SOSRow {
  id: string
  status: string
  patient_id: string
  patient_name: string | null
  driver_id: string | null
  driver_name: string | null
  driver_phone: string | null
  location_lat: number | null
  location_lon: number | null
  status_history: string | null
}

const TERMINAL_STATUSES = new Set(['Cancelled', 'Timed Out'])

/**
 * A no-driver timeout is persisted as 'Cancelled' (the CHECK constraint historically
 * had no 'Timed Out' value, and both writers still down-map), and is distinguished
 * from a deliberate user cancel ONLY by the actor tag on the last status_history
 * entry. Both the mobile timeout path and the server-side reaper tag it actor='system'.
 */
function isSystemTimeout(row: SOSRow, newStatus: string): boolean {
  if (newStatus === 'Timed Out') return true

  try {
    const history = row.status_history ? JSON.parse(row.status_history) : []
    if (!Array.isArray(history) || history.length === 0) return false
    return history[history.length - 1]?.actor === 'system'
  } catch {
    return false
  }
}

/** Which event, if any, this transition represents. */
export function classify(row: SOSRow, t: SOSTransition): SOSPushEvent | null {
  const { oldStatus, newStatus, oldDriverId } = t

  // Creation.
  if (oldStatus === null) {
    return newStatus === 'SOS Triggered' ? 'sos.created' : null
  }

  if (newStatus === 'Driver En Route') return 'sos.accepted'
  if (newStatus === 'Transport Arrived') return 'sos.transport_arrived'

  if (TERMINAL_STATUSES.has(newStatus)) {
    // A driver was already on the way and the request ended → they must stand down.
    // This is the highest-consequence miss in the whole system: without it a driver
    // keeps blue-lighting to an emergency that no longer exists.
    if (oldDriverId) return 'sos.cancelled'

    // Nobody was ever assigned, and the system (not the patient) ended it → the
    // patient is still waiting and does not know help isn't coming.
    if (isSystemTimeout(row, newStatus)) return 'sos.no_driver'

    // Patient cancelled before any driver accepted. They did it themselves and are
    // looking at the screen — nothing to tell anyone.
    return null
  }

  // 'User Picked Up' / 'Arrived at Hospital' are not in Phase 1. Adding them is a
  // case here plus a case in the mobile router.
  return null
}

/** Haversine, km. */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function getRadiusKm(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', 'driver_sos_request_radius_km')
    .maybeSingle()

  const match = String(data?.value ?? '').trim().match(/-?\d+(?:\.\d+)?/)
  const parsed = match ? parseFloat(match[0]) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RADIUS_KM
}

/** FCM token of a single user, if they have one and are still active. */
async function tokenForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string | null
): Promise<string[]> {
  if (!userId) return []
  const { data } = await supabase
    .from('users')
    .select('fcm_token, is_active')
    .eq('id', userId)
    .maybeSingle()

  return data?.fcm_token && data.is_active ? [data.fcm_token] : []
}

/**
 * Tokens of every driver who could take this request: online, active, has a device
 * token, and within the dispatch radius.
 *
 * Fails OPEN on missing coordinates — a driver with no last-known location, or an
 * SOS with no coordinates, still gets the push. Reaching one driver too many is
 * recoverable (the app's own radius filter hides the request); reaching none is not.
 */
async function tokensForNearbyDrivers(
  supabase: ReturnType<typeof createClient>,
  row: SOSRow
): Promise<string[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('user_id, current_latitude, current_longitude, status, users!inner(fcm_token, is_active)')
    .eq('status', 'available')

  if (error) {
    console.error('[push] failed to load available drivers', error)
    return []
  }

  const radiusKm = await getRadiusKm(supabase)
  const sosLat = row.location_lat
  const sosLon = row.location_lon

  const tokens: string[] = []
  let outOfRange = 0
  let noLocation = 0

  for (const d of data ?? []) {
    // Supabase types the !inner embed as an array; it is 1:1 here (drivers.user_id PK).
    const user = (Array.isArray(d.users) ? d.users[0] : d.users) as
      | { fcm_token: string | null; is_active: boolean }
      | undefined

    if (!user?.fcm_token || !user.is_active) continue

    const hasDriverLoc = d.current_latitude != null && d.current_longitude != null
    const hasSosLoc = sosLat != null && sosLon != null

    if (hasDriverLoc && hasSosLoc) {
      const km = distanceKm(Number(d.current_latitude), Number(d.current_longitude), sosLat, sosLon)
      if (km > radiusKm) {
        outOfRange++
        continue
      }
    } else {
      noLocation++
    }

    tokens.push(user.fcm_token)
  }

  if (outOfRange || noLocation) {
    console.log(
      `[push] sos.created audience: ${tokens.length} driver(s) — ${outOfRange} outside ${radiusKm}km, ${noLocation} included without coordinates (fail-open)`
    )
  }

  return tokens
}

function buildPayload(event: SOSPushEvent, row: SOSRow): PushPayload {
  const patient = row.patient_name?.trim() || 'A patient'
  const driver = row.driver_name?.trim() || 'Your driver'

  switch (event) {
    case 'sos.created':
      return {
        title: '🚨 New SOS request',
        body: `${patient} needs emergency transport. Tap to view and accept.`,
        data: {
          type: 'sos_new_request',
          requestId: row.id,
          ...(row.patient_name ? { patientName: row.patient_name } : {}),
          ...(row.location_lat != null ? { latitude: String(row.location_lat) } : {}),
          ...(row.location_lon != null ? { longitude: String(row.location_lon) } : {}),
        },
      }

    case 'sos.accepted':
      return {
        title: 'Driver on the way',
        body: `${driver} accepted your SOS and is en route to you.`,
        data: {
          type: 'sos_accepted',
          requestId: row.id,
          ...(row.driver_name ? { driverName: row.driver_name } : {}),
          ...(row.driver_phone ? { driverPhone: row.driver_phone } : {}),
        },
      }

    case 'sos.transport_arrived':
      return {
        title: 'Your ambulance has arrived',
        body: `${driver} is at your pickup location.`,
        data: { type: 'sos_transport_arrived', requestId: row.id },
      }

    case 'sos.no_driver':
      return {
        title: 'No driver available',
        body: 'We could not find a driver for your SOS. Please call 108 immediately.',
        data: { type: 'sos_no_driver', requestId: row.id },
      }

    case 'sos.cancelled':
      return {
        title: 'SOS cancelled',
        body: `${patient} cancelled this request. You can stand down.`,
        data: { type: 'sos_cancelled', requestId: row.id },
      }
  }
}

/** Stop pushing to tokens FCM has told us are permanently dead. */
async function pruneInvalidTokens(
  supabase: ReturnType<typeof createClient>,
  tokens: string[]
): Promise<void> {
  if (tokens.length === 0) return
  const { error } = await supabase
    .from('users')
    .update({ fcm_token: null, fcm_token_updated_at: null })
    .in('fcm_token', tokens)

  if (error) console.warn('[push] failed to prune invalid tokens', error)
  else console.log(`[push] pruned ${tokens.length} unregistered token(s)`)
}

/**
 * Entry point: turn one SOS transition into zero or more pushes.
 * Never throws — the caller is a webhook that must always answer 200.
 */
export async function dispatchSOSPush(t: SOSTransition): Promise<DispatchResult> {
  const empty: DispatchResult = { event: null, recipients: 0, sent: 0, failed: 0 }
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('sos_requests')
    .select(
      'id, status, patient_id, patient_name, driver_id, driver_name, driver_phone, location_lat, location_lon, status_history'
    )
    .eq('id', t.requestId)
    .maybeSingle<SOSRow>()

  if (error || !row) {
    console.error(`[push] sos_request ${t.requestId} not found`, error)
    return empty
  }

  const event = classify(row, t)
  if (!event) return empty

  // The row we just re-read is authoritative; the trigger's driver_id can already be
  // stale by the time we run. For a stand-down we must reach the driver who WAS
  // assigned at the moment of the transition, which only the trigger knows.
  const tokens =
    event === 'sos.created'
      ? await tokensForNearbyDrivers(supabase, row)
      : event === 'sos.cancelled'
        ? await tokenForUser(supabase, t.oldDriverId)
        : await tokenForUser(supabase, row.patient_id)

  if (tokens.length === 0) {
    console.log(`[push] ${event} for ${row.id}: no reachable recipients`)
    return { event, recipients: 0, sent: 0, failed: 0 }
  }

  const result = await sendToTokens(tokens, buildPayload(event, row))
  await pruneInvalidTokens(supabase, result.invalidTokens)

  console.log(
    `[push] ${event} for ${row.id}: ${result.sent}/${tokens.length} delivered${result.failed ? `, ${result.failed} failed` : ''}`
  )

  return { event, recipients: tokens.length, sent: result.sent, failed: result.failed }
}
