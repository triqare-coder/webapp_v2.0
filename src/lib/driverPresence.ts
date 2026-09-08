// Driver duty state — one rule, four answers, every screen.
//
// The portal used to derive this eleven different ways. The same driver read
// "Stale" on ER Team, "Duty unknown" on the Admin dashboard and "Available" on
// the Admin driver list, simultaneously, because each screen re-derived duty
// from whichever column was nearest. This file is the single derivation; a
// screen that hand-rolls its own count is a bug, not a variation.
//
// The signals, and why no single one of them is the answer:
//
//   drivers.status         — owned by explicit transitions in the driver app
//                            (Go Online → 'available', accept → 'assigned' /
//                            'on_trip', Go Offline / sign-out → 'inactive').
//                            Over-reports on its own: a force-killed app leaves
//                            the row on 'available' forever, and 5 of the 17
//                            drivers currently claiming 'available' on live have
//                            no registered device — dispatch cannot reach them.
//
//   device_tokens          — the push row the dispatch route sends the SOS to.
//                            Says nothing about whether the driver is on duty,
//                            but without it "on duty" is a promise nobody can
//                            keep. Read via fetchPushReachability().
//
//   drivers.last_updated_at — the location heartbeat, written by
//                            Location.watchPositionAsync in the driver app's
//                            app/(driver)/index.tsx. FOREGROUND-ONLY, so it
//                            stops the moment a driver pockets the phone, which
//                            is exactly what a working driver does. The freshest
//                            position anywhere in the fleet is routinely hours
//                            old, so any state defined as "GPS in the last 10
//                            minutes" reads zero across the whole fleet. That is
//                            why live GPS is a FLAG on a duty state here
//                            (`hasLiveGps`), never a state of its own, and never
//                            the number a dashboard leads with.
//
// The test each state has to answer: *can dispatch send this driver an SOS in
// the next 60 seconds, and if not, whose problem is it?*

export type DriverPresence =
  /** Holding a live emergency. Not available for a new one. */
  | 'on_trip'
  /** On duty in the app AND has a live device an SOS will land on. */
  | 'on_duty'
  /** Believes they are on duty; dispatch cannot reach them. A work queue. */
  | 'needs_attention'
  /** Went off duty or signed out. Not expected to answer. */
  | 'off_duty'

/**
 * Why a driver needs attention. Both cases are the same colour on screen — an
 * operator has to ring the driver either way — but they are different faults, so
 * the wording and the diagnostic counts keep them apart.
 */
export type NeedsAttentionReason =
  /** Checked: no active device_tokens row. The SOS push has nowhere to land. */
  | 'no_device'
  /** The reachability lookup itself failed, so we genuinely do not know. */
  | 'unchecked'

/**
 * A driver on duty whose last position is older than this is not sending live
 * GPS. The heartbeat is foreground-only, so backgrounding the app is enough to
 * cross this line — which is why crossing it only clears the `hasLiveGps` flag
 * and NEVER changes the duty state.
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
   * Is the SOS that `currentRequestId` points at actually still live?
   *
   * The pointer leaks. A patient cancelling from the mobile app writes
   * sos_requests.status = 'Cancelled' and nothing else — the app never touches
   * the drivers table — so the assigned driver keeps `current_request_id` set
   * forever. On live that pinned one driver to a request cancelled 4 days
   * earlier, and because a live assignment outranks every other signal he read
   * "On Trip" on every screen while the fleet had no active emergency at all.
   *
   *   true      — the linked request is live. On Trip.
   *   false     — checked, and it is terminal (or gone). The pointer is stale:
   *               ignore it and derive duty from the driver's own state.
   *   undefined — the caller did not look. The pointer is TRUSTED, because
   *               hiding a driver who really is mid-emergency is far worse than
   *               showing a stale trip. Callers that can cheaply resolve the
   *               request status should pass it.
   */
  currentRequestIsActive?: boolean
  /**
   * Does this driver have an active row in device_tokens?
   *
   * Four distinct values, because "no" and "we could not check" are different
   * answers and collapsing them is how the green-badge bug happened:
   *   true      — reachable. 'on_duty'.
   *   false     — checked, and there is no device. 'needs_attention'.
   *   null      — the lookup was attempted and FAILED. Still
   *               'needs_attention', but with reason 'unchecked', so the screen
   *               says we could not check rather than blaming the driver.
   *   undefined — the caller never looked it up (a view with no access to the
   *               token data). Left alone, so such a caller does not report its
   *               whole fleet as broken.
   */
  hasPushToken?: boolean | null
}

export interface DriverPresenceResult {
  presence: DriverPresence
  label: string
  /** Minutes since the last heartbeat; null when the driver never reported one. */
  minutesSinceHeartbeat: number | null
  /**
   * Is the app reporting positions right now? A detail OF a duty state, not a
   * state — see the header note on the foreground-only heartbeat.
   */
  hasLiveGps: boolean
  /** Would dispatch page this driver right now? */
  dispatchable: boolean
  /** Set only for 'needs_attention'. */
  reason: NeedsAttentionReason | null
}

const LABELS: Record<DriverPresence, string> = {
  on_trip: 'On Trip',
  on_duty: 'On Duty',
  needs_attention: 'Needs Attention',
  off_duty: 'Off Duty',
}

export const PRESENCE_LABEL = LABELS

/**
 * The states in which dispatch will actually reach the driver. 'needs_attention'
 * is deliberately excluded: that driver believes they are on duty, but the SOS
 * push has nowhere to go.
 */
const DISPATCHABLE: ReadonlySet<DriverPresence> = new Set<DriverPresence>([
  'on_trip',
  'on_duty',
])

export function isDispatchable(presence: DriverPresence): boolean {
  return DISPATCHABLE.has(presence)
}

/** Worst-first, for rosters and lists: the states someone must act on lead. */
export const PRESENCE_RANK: Record<DriverPresence, number> = {
  needs_attention: 0,
  on_trip: 1,
  on_duty: 2,
  off_duty: 3,
}

export function getDriverPresence(
  input: DriverPresenceInput,
  now: Date = new Date(),
): DriverPresenceResult {
  const { status, lastUpdatedAt, currentRequestId, currentRequestIsActive, hasPushToken } =
    input

  const heartbeat = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : NaN
  const minutesSinceHeartbeat = Number.isFinite(heartbeat)
    ? Math.max(0, Math.floor((now.getTime() - heartbeat) / 60000))
    : null
  const hasLiveGps =
    minutesSinceHeartbeat !== null && minutesSinceHeartbeat <= PRESENCE_STALE_MINUTES

  const decide = (
    presence: DriverPresence,
    reason: NeedsAttentionReason | null = null,
  ): DriverPresenceResult => ({
    presence,
    label: LABELS[presence],
    minutesSinceHeartbeat,
    hasLiveGps,
    dispatchable: DISPATCHABLE.has(presence),
    reason,
  })

  // A live assignment outranks everything: the driver is demonstrably working
  // even if the app has stopped reporting coordinates. But only a LIVE one — see
  // currentRequestIsActive for why a pointer alone is not proof of a trip.
  const holdsLiveRequest = Boolean(currentRequestId) && currentRequestIsActive !== false
  if (holdsLiveRequest || status === 'assigned' || status === 'on_trip') {
    return decide('on_trip')
  }

  if (status === 'available') {
    // See hasPushToken above for why these four cases are not three.
    if (hasPushToken === false) return decide('needs_attention', 'no_device')
    if (hasPushToken === null) return decide('needs_attention', 'unchecked')
    return decide('on_duty')
  }

  // 'inactive', anything unrecognised, and users with no drivers row.
  return decide('off_duty')
}

/**
 * The operator-facing explanation for a badge. Says what to DO where there is
 * something to do — a red chip with no next action just worries people.
 */
export function describePresence(result: DriverPresenceResult): string {
  const seen = formatLastSeen(result.minutesSinceHeartbeat)
  switch (result.presence) {
    case 'on_trip':
      return `Holding a live emergency. Last position: ${seen}.`
    case 'on_duty':
      return result.hasLiveGps
        ? `On duty and sending live location (last position: ${seen}).`
        : `On duty and reachable by push. No live location — the driver app only ` +
          `reports positions while it is open, so this is normal (last position: ${seen}).`
    case 'needs_attention':
      return result.reason === 'no_device'
        ? `Marked on duty, but no device is registered for push — an SOS cannot ` +
          `reach this driver. Ask them to sign in to the app again.`
        : `Marked on duty, but the push reachability check failed, so we cannot ` +
          `say whether an SOS would reach this driver. Ring them to confirm.`
    case 'off_duty':
      return `Went off duty or signed out. Last position: ${seen}.`
  }
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

/** Tailwind badge classes, shared so every dashboard colours duty the same. */
export const PRESENCE_BADGE_CLASS: Record<DriverPresence, string> = {
  on_trip: 'bg-blue-100 text-blue-800',
  on_duty: 'bg-emerald-100 text-emerald-800',
  // Red, not amber: this is a driver who thinks they are on duty and will never
  // be paged. It is a fault to fix, not a quieter shade of working.
  needs_attention: 'bg-red-100 text-red-800',
  off_duty: 'bg-gray-100 text-gray-700',
}

/** Emoji dots for the compact ER Team rows. */
export const PRESENCE_DOT: Record<DriverPresence, string> = {
  on_trip: '🔵',
  on_duty: '🟢',
  needs_attention: '🔴',
  off_duty: '⚪',
}

export interface PresenceSummary extends Record<DriverPresence, number> {
  total: number
  /** on_trip + on_duty — the drivers dispatch can actually reach. */
  dispatchable: number
  /** Subset of on_duty + on_trip whose app is reporting positions right now. */
  liveGps: number
  /** Breakdown of needs_attention, so a lookup outage stays diagnosable. */
  noDevice: number
  unchecked: number
}

/** Counts for the dashboard tiles. */
export function summarisePresence(
  drivers: DriverPresenceInput[],
  now: Date = new Date(),
): PresenceSummary {
  const counts: PresenceSummary = {
    on_trip: 0,
    on_duty: 0,
    needs_attention: 0,
    off_duty: 0,
    total: drivers.length,
    dispatchable: 0,
    liveGps: 0,
    noDevice: 0,
    unchecked: 0,
  }
  for (const d of drivers) {
    const result = getDriverPresence(d, now)
    counts[result.presence] += 1
    if (result.dispatchable) {
      counts.dispatchable += 1
      if (result.hasLiveGps) counts.liveGps += 1
    }
    if (result.reason === 'no_device') counts.noDevice += 1
    if (result.reason === 'unchecked') counts.unchecked += 1
  }
  return counts
}
