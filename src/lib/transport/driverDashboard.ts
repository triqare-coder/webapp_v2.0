import { getDriverPresence, PRESENCE_LABEL, type DriverPresence } from '@/lib/driverPresence'

/**
 * Shared vocabulary + derivations for the transport dashboard enhancement.
 * Import-safe on client and server. Keeps status/outcome/amber logic identical
 * across the API and the UI.
 */

// SOS status values are inconsistent across the DB history (lowercase migration
// values vs the later workflow vocabulary), so match BOTH defensively.
export const COMPLETED_STATUSES = ['completed', 'Arrived at Hospital']
export const CANCELLED_STATUSES = ['cancelled', 'Cancelled']
/** Statuses that mean a trip is currently underway. */
export const ACTIVE_TRIP_STATUSES = ['assigned', 'in_progress', 'En Route', 'Arrived at Scene', 'Picked Up']

/**
 * The transport dashboard used to carry its own five-value vocabulary here
 * ('online' / 'stale' / 'offline' / 'unavailable' / 'on_trip'), which is how a
 * transport company's numbers stopped reconciling with Admin's for the same
 * fleet — 'Unavailable' and 'Offline' were two words for one state, and 'Online'
 * meant "the app is in the foreground". It is now the shared four, so a company
 * owner and an admin looking at the same driver read the same word.
 */
export type DriverLiveStatus = DriverPresence

export const DRIVER_STATUS_LABEL: Record<DriverLiveStatus, string> = PRESENCE_LABEL

/**
 * Duty state for one driver row, from the one derivation. `is_available: false`
 * is treated as off duty even when `status` still says 'available': it is the
 * company owner's own deactivation switch, and it outranks the driver's flag.
 *
 * Pass `hasPushToken` where the caller can read device_tokens (server-side, via
 * fetchPushReachability) — without it an on-duty driver with no registered
 * device cannot be told from a reachable one, and reads as On Duty.
 */
export function deriveDriverStatus(d: {
  status?: string | null
  is_available?: boolean | null
  current_request_id?: string | null
  last_updated_at?: string | null
  has_push_token?: boolean | null
}): DriverLiveStatus {
  if (d.current_request_id || d.status === 'on_trip' || d.status === 'assigned') return 'on_trip'
  if (d.is_available === false) return 'off_duty'
  return getDriverPresence({
    status: d.status,
    lastUpdatedAt: d.last_updated_at,
    hasPushToken: d.has_push_token,
  }).presence
}

export type TripOutcome = 'Completed' | 'Cancelled' | 'In Progress'

export function tripOutcome(status: string): TripOutcome {
  if (COMPLETED_STATUSES.includes(status)) return 'Completed'
  if (CANCELLED_STATUSES.includes(status)) return 'Cancelled'
  return 'In Progress'
  // NOTE: 'Nearest Hospital' outcome is deferred (no actual-destination field yet).
}

// Amber row highlight: high cancellations/rejections in a rolling window.
export const AMBER_WINDOW_DAYS = 30
export const AMBER_THRESHOLD = 5

export function isHighRiskDriver(sosCancellations: number, sosRejections: number): boolean {
  return sosCancellations + sosRejections >= AMBER_THRESHOLD
}

export interface DriverDashboardStats {
  driverId: string
  currentStatus: DriverLiveStatus
  totalTrips: number
  sosCancellations: number
  sosRejections: number
  amber: boolean
}
