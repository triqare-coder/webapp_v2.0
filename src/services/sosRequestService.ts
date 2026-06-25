import { supabase } from '@/lib/supabase'
import {
  SOS_STATUSES,
  normalizeSOSStatus,
  isTerminalStatus,
  appendStatusHistory,
  initStatusHistory,
  type SOSStatus,
} from '@/lib/sosStatus'

// Shape of the live sos_requests row (inline driver model is canonical).
interface DatabaseSOSRequest {
  id: string
  patient_id: string
  requested_at: string
  assigned_at?: string | null
  completed_at?: string | null
  auto_assigned: boolean
  status: string
  location_lat?: number | null
  location_lon?: number | null
  patient_name?: string | null
  patient_phone?: string | null
  driver_id?: string | null
  driver_name?: string | null
  driver_phone?: string | null
  status_history?: string | null
  created_at?: string
  updated_at?: string
}

export interface SOSRequestStats {
  total: number
  pending: number       // SOS Triggered (awaiting driver)
  assigned: number      // Driver En Route
  in_progress: number   // Transport Arrived + User Picked Up
  completed: number     // Arrived at Hospital
  cancelled: number     // Cancelled
}

/** Free a driver back to the available pool (terminal SOS or unassignment). */
async function releaseDriver(driverUserId?: string | null) {
  if (!driverUserId) return
  await supabase
    .from('drivers')
    .update({ status: 'available', is_available: true, current_request_id: null })
    .eq('user_id', driverUserId)
}

/** Keep the legacy sos_request_assigned junction in sync (back-compat for older readers). */
async function syncAssignmentJunction(sosRequestId: string, driverUserId: string) {
  const { data: existing } = await supabase
    .from('sos_request_assigned')
    .select('id')
    .eq('sos_request_id', sosRequestId)
  const payload = { driver_id: driverUserId, assigned_at: new Date().toISOString() }
  if (existing && existing.length > 0) {
    await supabase.from('sos_request_assigned').update(payload).eq('sos_request_id', sosRequestId)
  } else {
    await supabase.from('sos_request_assigned').insert({ sos_request_id: sosRequestId, ...payload })
  }
}

export class SOSRequestService {
  static async getStats(): Promise<SOSRequestStats> {
    try {
      const { data, error } = await supabase.from('sos_requests').select('status')
      if (error) throw error

      const stats: SOSRequestStats = { total: data.length, pending: 0, assigned: 0, in_progress: 0, completed: 0, cancelled: 0 }
      data.forEach((request) => {
        switch (normalizeSOSStatus(request.status)) {
          case 'SOS Triggered': stats.pending++; break
          case 'Driver En Route': stats.assigned++; break
          case 'Transport Arrived':
          case 'User Picked Up': stats.in_progress++; break
          case 'Arrived at Hospital': stats.completed++; break
          case 'Cancelled': stats.cancelled++; break
        }
      })
      return stats
    } catch (error) {
      console.error('Error fetching SOS request stats:', error)
      throw error
    }
  }

  /**
   * Assign a driver to an SOS request. Writes the canonical inline model
   * (driver_id/name/phone + status 'Driver En Route'), marks the driver busy,
   * appends to status_history, and dual-writes the legacy junction.
   */
  static async assignDriver(
    sosRequestId: string,
    driverUserId: string,
    opts: { autoAssigned?: boolean } = {}
  ): Promise<DatabaseSOSRequest> {
    // 1. Load the request + guard against terminal state.
    const { data: current, error: curErr } = await supabase
      .from('sos_requests')
      .select('id, status, status_history, driver_id')
      .eq('id', sosRequestId)
      .single()
    if (curErr || !current) throw new Error('SOS request not found')
    if (isTerminalStatus(current.status)) throw new Error('Cannot assign a driver to a completed or cancelled request')

    // 2. Resolve the driver (must be a real driver user) + denormalized contact info.
    const { data: driverUser, error: dErr } = await supabase
      .from('users')
      .select('id, full_name, phone, role')
      .eq('id', driverUserId)
      .eq('role', 'driver')
      .single()
    if (dErr || !driverUser) throw new Error('Driver not found or invalid role')

    // 3. Availability guard against the real source of truth (drivers table).
    const { data: driverRow } = await supabase
      .from('drivers')
      .select('status, current_request_id')
      .eq('user_id', driverUserId)
      .maybeSingle()
    if (driverRow && driverRow.status !== 'available' && driverRow.current_request_id !== sosRequestId) {
      throw new Error('Driver is already assigned to another active SOS request')
    }

    // 4. Write canonical inline assignment on the request.
    const { data: updated, error: upErr } = await supabase
      .from('sos_requests')
      .update({
        status: 'Driver En Route',
        assigned_at: new Date().toISOString(),
        auto_assigned: opts.autoAssigned ?? false,
        driver_id: driverUser.id,
        driver_name: driverUser.full_name,
        driver_phone: driverUser.phone,
        status_history: appendStatusHistory(current.status_history, 'Driver En Route'),
      })
      .eq('id', sosRequestId)
      .select()
      .single()
    if (upErr) { console.error('assignDriver: sos update failed', upErr); throw new Error(upErr.message) }

    // 5. Mark the driver busy + dual-write the legacy junction (best-effort).
    await supabase
      .from('drivers')
      .update({ status: 'on_trip', is_available: false, current_request_id: sosRequestId })
      .eq('user_id', driverUser.id)
    try { await syncAssignmentJunction(sosRequestId, driverUser.id) } catch (e) { console.warn('junction sync failed (non-fatal):', e) }

    return updated
  }

  /** Update status with enum normalization, history, timestamps, and driver release on terminal. */
  static async updateStatus(sosRequestId: string, status: string): Promise<DatabaseSOSRequest> {
    const canonical = normalizeSOSStatus(status)
    if (!canonical) throw new Error(`Invalid status value: must be one of ${SOS_STATUSES.join(', ')}`)

    const { data: current, error: curErr } = await supabase
      .from('sos_requests')
      .select('id, status_history, driver_id')
      .eq('id', sosRequestId)
      .single()
    if (curErr || !current) throw new Error('SOS request not found')

    const patch: Record<string, unknown> = {
      status: canonical,
      status_history: appendStatusHistory(current.status_history, canonical),
    }
    if (canonical === 'Arrived at Hospital') patch.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('sos_requests')
      .update(patch)
      .eq('id', sosRequestId)
      .select()
      .single()
    if (error) { console.error('updateStatus: sos update failed', error); throw new Error(error.message) }

    // Free the driver when the request reaches a terminal state.
    if (isTerminalStatus(canonical)) await releaseDriver(current.driver_id)
    return data
  }

  /** Remove a driver assignment and return the request to the unassigned state. */
  static async unassignDriver(sosRequestId: string): Promise<void> {
    const { data: current } = await supabase
      .from('sos_requests')
      .select('driver_id, status_history')
      .eq('id', sosRequestId)
      .single()
    await supabase
      .from('sos_requests')
      .update({
        status: 'SOS Triggered',
        driver_id: null,
        driver_name: null,
        driver_phone: null,
        assigned_at: null,
        status_history: appendStatusHistory(current?.status_history, 'SOS Triggered'),
      })
      .eq('id', sosRequestId)
    await releaseDriver(current?.driver_id)
    await supabase.from('sos_request_assigned').delete().eq('sos_request_id', sosRequestId)
  }

  static async getById(id: string): Promise<DatabaseSOSRequest | null> {
    try {
      const { data, error } = await supabase.from('sos_requests').select('*').eq('id', id).single()
      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching SOS request:', error)
      throw error
    }
  }

  static async getAll(): Promise<DatabaseSOSRequest[]> {
    try {
      const { data, error } = await supabase.from('sos_requests').select('*').order('requested_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching SOS requests:', error)
      throw error
    }
  }

  static async create(sosRequest: Partial<DatabaseSOSRequest>): Promise<DatabaseSOSRequest> {
    try {
      const status: SOSStatus = normalizeSOSStatus(sosRequest.status) ?? 'SOS Triggered'
      const { data, error } = await supabase
        .from('sos_requests')
        .insert([{
          ...sosRequest,
          status,
          requested_at: sosRequest.requested_at ?? new Date().toISOString(),
          status_history: sosRequest.status_history ?? initStatusHistory(status),
        }])
        .select()
        .single()
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating SOS request:', error)
      throw error
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('sos_requests').delete().eq('id', id)
      if (error) throw error
    } catch (error) {
      console.error('Error deleting SOS request:', error)
      throw error
    }
  }
}
