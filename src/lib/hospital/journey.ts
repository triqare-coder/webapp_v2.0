/**
 * One SOS as a hospital sees it: which stage it is at, when it closed, and the
 * full timeline from trigger to admission or stand-down.
 *
 * Everything here is derived, not stored. The driver app writes each stage into
 * sos_requests.status_history (the same 7-stage workflow the patient and driver
 * apps show), and hospital_sos_alerts already carries the hospital-side moments
 * (alerted, confirmed, stood down). Joining the two at read time gives the
 * dashboard the whole journey without a migration or an APK release.
 *
 * sos_requests is hard-deleted with the patient's account, so every function
 * accepts a missing SOS row and degrades to the alert's own timestamps.
 */

export type AlertStatus = 'PENDING' | 'CONFIRMED_INCOMING' | 'CANCELLED'
export type AlertOutcome = 'PENDING' | 'ADMITTED' | 'CANCELLED'

export interface JourneyAlert {
  status: AlertStatus
  outcome: AlertOutcome
  triggered_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  updated_at?: string | null
  destination_label: string | null
  destination_kind: 'primary' | 'secondary' | 'nearby' | null
}

export interface StatusHistoryEntry {
  status: string
  timestamp: string
  hospitalDetails?: { name?: string; kind?: string; hospitalId?: string } | null
}

export interface JourneySos {
  status: string | null
  status_history: unknown
  completed_at?: string | null
}

/** status_history is jsonb holding either an array or a JSON string of one. */
export function parseStatusHistory(raw: unknown): StatusHistoryEntry[] {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.filter(
    (e): e is StatusHistoryEntry =>
      !!e && typeof e === 'object' && typeof e.status === 'string' && typeof e.timestamp === 'string',
  )
}

/** Last time the SOS entered `status`, or null. */
function lastAt(history: StatusHistoryEntry[], status: string): string | null {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].status === status) return history[i].timestamp
  return null
}

/**
 * The outcome as this hospital should read it. A stand-down leaves the alert's
 * stored outcome at PENDING until the SOS itself ends (so a driver switching
 * back to this hospital can still re-confirm it), but for the hospital the
 * incident is over the moment it is told to stand down.
 */
export function effectiveOutcome(alert: Pick<JourneyAlert, 'status' | 'outcome'>): AlertOutcome {
  if (alert.outcome !== 'PENDING') return alert.outcome
  return alert.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING'
}

/** Still an emergency this hospital is preparing for: belongs on the Patients tab. */
export function isLiveAlert(alert: Pick<JourneyAlert, 'status' | 'outcome'>): boolean {
  return effectiveOutcome(alert) === 'PENDING'
}

/**
 * When the incident closed for this hospital: the ambulance's arrival for an
 * admission, the stand-down or cancellation otherwise. Null while live.
 */
export function closedAt(alert: JourneyAlert, sos: JourneySos | null): string | null {
  const outcome = effectiveOutcome(alert)
  if (outcome === 'PENDING') return null
  const history = parseStatusHistory(sos?.status_history)
  if (outcome === 'ADMITTED') {
    return lastAt(history, 'Arrived at Hospital') ?? sos?.completed_at ?? alert.updated_at ?? null
  }
  return (
    alert.cancelled_at ??
    lastAt(history, 'Cancelled') ??
    lastAt(history, 'Timed Out') ??
    alert.updated_at ??
    null
  )
}

export type StageKey =
  | 'TRIGGERED'
  | 'AMBULANCE_EN_ROUTE'
  | 'AMBULANCE_AT_PATIENT'
  | 'EN_ROUTE_TO_HOSPITAL'
  | 'ADMITTED'
  | 'CANCELLED'

export interface Stage {
  key: StageKey
  label: string
  /** When the SOS entered this stage, if known. */
  at: string | null
}

/**
 * The live stage, in the same words as the app's own SOS workflow. A confirmed
 * alert is only "incoming" once the patient is actually in the ambulance, which
 * is also the moment the driver picks a hospital -- so CONFIRMED_INCOMING and
 * 'User Picked Up' coincide by construction.
 */
export function currentStage(alert: JourneyAlert, sos: JourneySos | null): Stage {
  const history = parseStatusHistory(sos?.status_history)
  const outcome = effectiveOutcome(alert)

  if (outcome === 'ADMITTED') return { key: 'ADMITTED', label: 'Arrived — admitted', at: closedAt(alert, sos) }
  if (outcome === 'CANCELLED') return { key: 'CANCELLED', label: 'Cancelled', at: closedAt(alert, sos) }

  if (alert.status === 'CONFIRMED_INCOMING') {
    return {
      key: 'EN_ROUTE_TO_HOSPITAL',
      label: 'En route to your hospital',
      at: lastAt(history, 'User Picked Up') ?? alert.confirmed_at,
    }
  }

  switch (sos?.status) {
    case 'Driver En Route':
      return { key: 'AMBULANCE_EN_ROUTE', label: 'Ambulance en route to patient', at: lastAt(history, 'Driver En Route') }
    case 'Transport Arrived':
      return { key: 'AMBULANCE_AT_PATIENT', label: 'Ambulance reached patient', at: lastAt(history, 'Transport Arrived') }
    case 'User Picked Up':
      // Picked up, but this hospital is not (yet) the confirmed destination.
      return { key: 'AMBULANCE_AT_PATIENT', label: 'Patient picked up', at: lastAt(history, 'User Picked Up') }
    default:
      return { key: 'TRIGGERED', label: 'SOS triggered — awaiting ambulance', at: alert.triggered_at }
  }
}

export interface JourneyStep {
  at: string
  label: string
  detail?: string
  /** Hospital-side event (alerted / confirmed / stood down), not an SOS stage. */
  hospital?: boolean
  /** Milliseconds since the SOS was triggered. */
  sinceSosMs: number
}

export interface JourneySummary {
  /** SOS → closed (admitted, stood down or cancelled); null while live. */
  totalMs: number | null
  /** SOS → ambulance reached the patient. */
  responseMs: number | null
  /** Patient picked up → arrived at hospital. */
  transportMs: number | null
}

const STAGE_LABEL: Record<string, string> = {
  'SOS Triggered': 'SOS triggered',
  'Driver En Route': 'Ambulance assigned — en route to patient',
  'Transport Arrived': 'Ambulance reached patient',
  'User Picked Up': 'Patient picked up',
  'Arrived at Hospital': 'Arrived at hospital',
  Cancelled: 'SOS cancelled',
  'Timed Out': 'SOS timed out — no ambulance accepted',
}

function ms(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null
  const d = new Date(to).getTime() - new Date(from).getTime()
  return Number.isFinite(d) && d >= 0 ? d : null
}

/**
 * The full timeline for one alert, oldest first, plus the headline durations.
 *
 * After a stand-down the rest of the trip belongs to another hospital, so the
 * arrival there is left out; the hospital sees up to and including the pickup
 * that released it. Cut by stage, not by time: the stages are stamped by the
 * driver's phone and the stand-down by the database, and the few seconds of
 * clock skew between them used to drop the pickup itself.
 */
export function buildJourney(
  alert: JourneyAlert,
  sos: JourneySos | null,
): { steps: JourneyStep[]; summary: JourneySummary; closedAt: string | null } {
  const history = parseStatusHistory(sos?.status_history)
  const outcome = effectiveOutcome(alert)
  const start = lastAt(history, 'SOS Triggered') ?? alert.triggered_at
  const standDownAt = alert.status === 'CANCELLED' ? alert.cancelled_at : null

  const raw: Omit<JourneyStep, 'sinceSosMs'>[] = []

  for (const e of history) {
    if (standDownAt && e.status === 'Arrived at Hospital') continue
    let label = STAGE_LABEL[e.status] ?? e.status
    let detail: string | undefined
    if (e.status === 'User Picked Up' && e.hospitalDetails?.name) {
      detail =
        e.hospitalDetails.kind === 'nearby'
          ? `Heading to the nearest hospital (off-platform): ${e.hospitalDetails.name}`
          : `Heading to ${e.hospitalDetails.name}`
    }
    if (e.status === 'Arrived at Hospital' && outcome === 'ADMITTED') label = 'Arrived at your hospital — admitted'
    raw.push({ at: e.timestamp, label, detail })
  }

  // Without a status_history (account deleted) the trigger itself is still known.
  if (!history.length) raw.push({ at: alert.triggered_at, label: 'SOS triggered' })

  raw.push({ at: alert.triggered_at, label: 'Your hospital was alerted', hospital: true })
  if (alert.confirmed_at) {
    raw.push({ at: alert.confirmed_at, label: 'Confirmed incoming to your hospital', hospital: true })
  }
  if (standDownAt) {
    raw.push({
      at: standDownAt,
      label: 'Stood down',
      detail:
        alert.destination_kind === 'nearby'
          ? 'Patient taken to the nearest hospital (off-platform)'
          : alert.destination_label
            ? `Patient taken to ${alert.destination_label}`
            : 'The SOS was cancelled',
      hospital: true,
    })
  }
  if (outcome === 'ADMITTED' && !lastAt(history, 'Arrived at Hospital')) {
    const at = closedAt(alert, sos)
    if (at) raw.push({ at, label: 'Arrived at your hospital — admitted' })
  }

  const startMs = new Date(start).getTime()
  const steps = raw
    .map((s) => ({ ...s, sinceSosMs: Math.max(0, new Date(s.at).getTime() - startMs) }))
    // Stable: equal timestamps keep insertion order (SOS stage before hospital event).
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  const closed = closedAt(alert, sos)
  const pickedUp = lastAt(history, 'User Picked Up')
  return {
    steps,
    closedAt: closed,
    summary: {
      totalMs: ms(start, closed),
      responseMs: ms(start, lastAt(history, 'Transport Arrived')),
      transportMs: outcome === 'ADMITTED' ? ms(pickedUp, closed) : null,
    },
  }
}

/** "4m 05s", "1h 12m", "38s". */
export function formatDuration(msValue: number | null | undefined): string {
  if (msValue == null) return '—'
  const total = Math.round(msValue / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/** "25 Sep 2026, 09:23 pm" in the dashboard's locale. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
