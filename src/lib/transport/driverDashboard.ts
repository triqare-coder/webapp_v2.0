import { getDriverPresence } from '@/lib/driverPresence'

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

export type DriverLiveStatus = 'on_trip' | 'online' | 'stale' | 'offline' | 'unavailable'

export const DRIVER_STATUS_LABEL: Record<DriverLiveStatus, string> = {
  on_trip: 'On Trip',
  online: 'Online',
  stale: 'On duty',
  offline: 'Offline',
  unavailable: 'Unavailable',
}

/**
 * Live status for one driver row:
 *   On Trip     — currently assigned to a request
 *   Unavailable — deactivated by the owner (status 'inactive')
 *   Offline     — not available, but not deactivated
 *   Online      — available AND the app is still reporting a position
 *   On Duty     — available but silent past the presence window
 *
 * There *is* a presence signal — drivers.last_updated_at, refreshed by the
 * mobile location watcher — and this used to ignore it, so a driver who set
 * themselves available in July and then force-quit the app still read "Online"
 * six weeks later. Callers that cannot supply lastUpdatedAt keep the old
 * behaviour (available ⇒ Online) rather than being told everyone is idle.
 */
export function deriveDriverStatus(d: {
  status?: string | null
  is_available?: boolean | null
  current_request_id?: string | null
  last_updated_at?: string | null
}): DriverLiveStatus {
  if (d.current_request_id || d.status === 'on_trip' || d.status === 'assigned') return 'on_trip'
  if (d.status === 'inactive') return 'unavailable'
  if (d.is_available === false) return 'offline'
  if (d.last_updated_at === undefined) return 'online'
  return getDriverPresence({ status: 'available', lastUpdatedAt: d.last_updated_at }).presence ===
    'online'
    ? 'online'
    : 'stale'
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
