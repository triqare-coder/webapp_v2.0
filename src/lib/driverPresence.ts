// Is a driver actually online right now?
//
// The portal used to answer this from `users.last_sign_in_at`, which the mobile
// app never writes — 30 of 32 live driver accounts have it NULL, so every driver
// resolved to "offline" on the ERT Driver Status page no matter what they were
// doing. The signals that do exist live on `drivers` and in `device_tokens`:
//
//   status          — owned by explicit transitions in the driver app
//                     (Go Online → 'available', accept → 'assigned'/'on_trip',
//                     Go Offline / sign-out → 'inactive').
//   last_updated_at — refreshed by the FOREGROUND location watcher roughly every
//                     15s / 25m while the driver has the app open.
//   device_tokens   — the push token the dispatch route sends the SOS to.
//
// None of the three works alone:
//
//   status alone over-reports. A force-killed app leaves the row on 'available'
//   forever, and six of the seventeen drivers currently claiming 'available' on
//   live have no push token at all — dispatch cannot reach them.
//
//   the heartbeat alone under-reports, badly enough to be useless as *the*
//   online signal. `Location.watchPositionAsync` in app/(driver)/index.tsx runs
//   only in the foreground, so it stops the moment a driver pockets the phone —
//   which is what a working driver does. On live the freshest heartbeat in the
//   whole fleet was 59 minutes old, so a 10-minute window scored 0 of 26 drivers
//   online, permanently. That is the bug behind "I can't see who is online".
//
//   the push token alone says nothing about whether the driver is on duty.
//
// So presence is reported as three separate facts rather than collapsed into
// one: does the driver say they are on duty, can dispatch reach them, and is the
// app currently sending live positions. 'online' keeps its strict meaning (live
// GPS), but it is no longer the number the dashboards lead with, because it
// measures "is the app in the foreground", not "can this driver take a job".

export type DriverPresence =
  /** Available and the app is reporting live positions — app in the foreground. */
  | 'online'
  /** Holding a live SOS. */
  | 'on_trip'
  /** Available and reachable by push, but no live position (app backgrounded). */
  | 'stale'
  /** Available but with no push token — declared on duty and NOT dispatchable. */
  | 'unreachable'
  /** Signed out, went offline, or has no drivers row. */
  | 'offline'

/**
 * A driver marked available but silent for longer than this has no live
 * position. The heartbeat is foreground-only, so backgrounding the app is enough
 * to cross this line — which is why crossing it means "no live GPS", not "not
 * working", and never downgrades a driver below 'stale'.
 */
export const PRESENCE_STALE_MINUTES = 10

export interface DriverPresenceInput {
  /** drivers.status — undefined/null when the user has no drivers row at all. */
  status?: string | null
  /** drivers.last_updated_at — the foreground location heartbeat. */
  lastUpdatedAt?: string | null
  /** drivers.current_request_id — set while the driver holds a live SOS. */
  currentRequestId?: string | null
  /**
   * Does this driver have an active row in device_tokens?
   *
   * `undefined` means the caller did not look it up, and is NOT treated as
   * "no token" — a caller that cannot supply it keeps the old behaviour rather
   * than having its whole fleet reported as unreachable.
   */
  hasPushToken?: boolean | null
}

export interface DriverPresenceResult {
  presence: DriverPresence
  label: string
  /** Minutes since the last heartbeat; null when the driver never reported one. */
  minutesSinceHeartbeat: number | null
  /** Would dispatch page this driver right now? */
  dispatchable: boolean
}

// "On duty" rather than "Idle": a driver whose app is backgrounded stops sending
// positions but is still reachable by push and still expects to be dispatched.
// Calling that state Idle — or worse, Offline — would tell dispatch to skip
// someone who is working. Only the driver's own Go Offline / sign-out produces
// 'offline'; only a missing push token produces 'unreachable'.
const LABELS: Record<DriverPresence, string> = {
  online: 'Online',
  on_trip: 'On trip',
  stale: 'On duty',
  unreachable: 'No app signal',
  offline: 'Offline',
}

/**
 * The states in which dispatch will actually reach the driver. 'unreachable' is
 * deliberately excluded: that driver believes they are on duty, but the SOS push
 * has nowhere to go.
 */
const DISPATCHABLE: ReadonlySet<DriverPresence> = new Set<DriverPresence>([
  'online',
  'on_trip',
  'stale',
])

export function isDispatchable(presence: DriverPresence): boolean {
  return DISPATCHABLE.has(presence)
}

export function getDriverPresence(
  input: DriverPresenceInput,
  now: Date = new Date(),
): DriverPresenceResult {
  const { status, lastUpdatedAt, currentRequestId, hasPushToken } = input

  const heartbeat = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : NaN
  const minutesSinceHeartbeat = Number.isFinite(heartbeat)
    ? Math.max(0, Math.floor((now.getTime() - heartbeat) / 60000))
    : null

  const decide = (presence: DriverPresence): DriverPresenceResult => ({
    presence,
    label: LABELS[presence],
    minutesSinceHeartbeat,
    dispatchable: DISPATCHABLE.has(presence),
  })

  // A live assignment outranks everything: the driver is demonstrably working
  // even if the app has stopped reporting coordinates.
  if (currentRequestId || status === 'assigned' || status === 'on_trip') {
    return decide('on_trip')
  }

  if (status === 'available') {
    // Explicitly false only — see hasPushToken above.
    if (hasPushToken === false) return decide('unreachable')

    const silent =
      minutesSinceHeartbeat === null || minutesSinceHeartbeat > PRESENCE_STALE_MINUTES
    return decide(silent ? 'stale' : 'online')
  }

  // 'inactive', anything unrecognised, and users with no drivers row.
  return decide('offline')
}

/** "2 min ago" / "3 days ago" / "never" — the age of the last position report. */
export function formatLastSeen(minutesSinceHeartbeat: number | null): string {
  if (minutesSinceHeartbeat === null) return 'never'
  if (minutesSinceHeartbeat < 1) return 'just now'
  if (minutesSinceHeartbeat < 60) return `${minutesSinceHeartbeat} min ago`
  const hours = Math.floor(minutesSinceHeartbeat / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Tailwind badge classes, shared so every dashboard colours presence the same. */
export const PRESENCE_BADGE_CLASS: Record<DriverPresence, string> = {
  online: 'bg-green-100 text-green-800',
  on_trip: 'bg-blue-100 text-blue-800',
  stale: 'bg-emerald-100 text-emerald-800',
  // Red, not amber: this is a driver who thinks they are on duty and will never
  // be paged. It is a fault to fix, not a quieter shade of working.
  unreachable: 'bg-red-100 text-red-800',
  offline: 'bg-gray-100 text-gray-700',
}

export interface PresenceSummary extends Record<DriverPresence, number> {
  total: number
  /** online + on_trip + stale — the drivers dispatch can actually reach. */
  dispatchable: number
}

/** Counts for the dashboard tiles. */
export function summarisePresence(
  drivers: DriverPresenceInput[],
  now: Date = new Date(),
): PresenceSummary {
  const counts: PresenceSummary = {
    online: 0,
    on_trip: 0,
    stale: 0,
    unreachable: 0,
    offline: 0,
    total: drivers.length,
    dispatchable: 0,
  }
  for (const d of drivers) {
    const { presence } = getDriverPresence(d, now)
    counts[presence] += 1
    if (DISPATCHABLE.has(presence)) counts.dispatchable += 1
  }
  return counts
}
