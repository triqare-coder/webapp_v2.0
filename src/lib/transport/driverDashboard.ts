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

export type DriverLiveStatus = 'on_trip' | 'online' | 'offline' | 'unavailable'

export const DRIVER_STATUS_LABEL: Record<DriverLiveStatus, string> = {
  on_trip: 'On Trip',
  online: 'Online',
  offline: 'Offline',
  unavailable: 'Unavailable',
}

/**
 * Heuristic live status from existing driver columns (no presence signal):
 *   On Trip   — currently assigned to a request
 *   Unavailable — deactivated by the owner (status 'inactive')
 *   Online    — available for dispatch
 *   Offline   — not available, but not deactivated
 */
export function deriveDriverStatus(d: {
  status?: string | null
  is_available?: boolean | null
  current_request_id?: string | null
}): DriverLiveStatus {
  if (d.current_request_id || d.status === 'on_trip' || d.status === 'assigned') return 'on_trip'
  if (d.status === 'inactive') return 'unavailable'
  if (d.is_available === false) return 'offline'
  return 'online'
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
