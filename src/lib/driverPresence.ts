// Is a driver actually online right now?
//
// The portal used to answer this from `users.last_sign_in_at`, which the mobile
// app never writes — 30 of 32 live driver accounts have it NULL, so every driver
// resolved to "offline" on the ERT Driver Status page no matter what they were
// doing. The real signals both live on `drivers`:
//
//   status          — owned by explicit transitions in the driver app
//                     (Go Online → 'available', accept → 'assigned'/'on_trip',
//                     Go Offline / sign-out → 'inactive').
//   last_updated_at — refreshed by the foreground location watcher roughly every
//                     15s / 25m while the driver is online.
//
// status alone over-reports: a force-killed app leaves the row on 'available'
// forever. The heartbeat alone under-reports: the watcher is foreground-only, so
// it goes quiet the moment the driver backgrounds the app. So we report the
// declared status AND how long it has been silent, and only downgrade a claimed
// 'available' to 'stale' — never to 'offline', which is a state only the driver
// can put themselves in.

export type DriverPresence = 'online' | 'on_trip' | 'stale' | 'offline'

/**
 * A driver marked available but silent for longer than this reads as 'stale' —
 * on duty, but with no live position. The heartbeat comes from the mobile
 * foreground location watcher, so backgrounding the app is enough to cross this
 * line; that is why 'stale' means "no live signal", not "not working".
 */
export const PRESENCE_STALE_MINUTES = 10

export interface DriverPresenceInput {
  /** drivers.status — undefined/null when the user has no drivers row at all. */
  status?: string | null
  /** drivers.last_updated_at — the location heartbeat. */
  lastUpdatedAt?: string | null
  /** drivers.current_request_id — set while the driver holds a live SOS. */
  currentRequestId?: string | null
}

export interface DriverPresenceResult {
  presence: DriverPresence
  label: string
  /** Minutes since the last heartbeat; null when the driver never reported one. */
  minutesSinceHeartbeat: number | null
}

// "On duty" rather than "Idle": a driver whose app is backgrounded stops sending
// positions but is still reachable by push and still expects to be dispatched.
// Calling that state Idle — or worse, Offline — would tell dispatch to skip
// someone who is working. Only the driver's own Go Offline / sign-out produces
// 'offline'.
const LABELS: Record<DriverPresence, string> = {
  online: 'Online',
  on_trip: 'On trip',
  stale: 'On duty',
  offline: 'Offline',
}

export function getDriverPresence(
  input: DriverPresenceInput,
  now: Date = new Date(),
): DriverPresenceResult {
  const { status, lastUpdatedAt, currentRequestId } = input

  const heartbeat = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : NaN
  const minutesSinceHeartbeat = Number.isFinite(heartbeat)
    ? Math.max(0, Math.floor((now.getTime() - heartbeat) / 60000))
    : null

  // A live assignment outranks everything: the driver is demonstrably working
  // even if the app has stopped reporting coordinates.
  if (currentRequestId || status === 'assigned' || status === 'on_trip') {
    return { presence: 'on_trip', label: LABELS.on_trip, minutesSinceHeartbeat }
  }

  if (status === 'available') {
    const silent =
      minutesSinceHeartbeat === null || minutesSinceHeartbeat > PRESENCE_STALE_MINUTES
    const presence: DriverPresence = silent ? 'stale' : 'online'
    return { presence, label: LABELS[presence], minutesSinceHeartbeat }
  }

  // 'inactive', anything unrecognised, and users with no drivers row.
  return { presence: 'offline', label: LABELS.offline, minutesSinceHeartbeat }
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
  stale: 'bg-amber-100 text-amber-800',
  offline: 'bg-gray-100 text-gray-700',
}

/** Counts for the dashboard tiles. */
export function summarisePresence(
  drivers: DriverPresenceInput[],
  now: Date = new Date(),
): Record<DriverPresence, number> & { total: number } {
  const counts = { online: 0, on_trip: 0, stale: 0, offline: 0, total: drivers.length }
  for (const d of drivers) {
    counts[getDriverPresence(d, now).presence] += 1
  }
  return counts
}
