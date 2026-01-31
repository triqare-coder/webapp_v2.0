import { supabase } from '@/lib/supabase'

// Define the DatabaseSOSRequest type locally
interface DatabaseSOSRequest {
  id: string
  patient_id: string
  requested_at: string
  assigned_at?: string
  completed_at?: string
  auto_assigned: boolean
  status: string
  created_at?: string
  updated_at?: string
}

export interface SOSRequestStats {
  total: number
  pending: number
  assigned: number
  in_progress: number
  completed: number
  cancelled: number
}

export class SOSRequestService {
  static async getStats(): Promise<SOSRequestStats> {
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .select('status')

      if (error) throw error

      const stats: SOSRequestStats = {
        total: data.length,
        pending: 0,
        assigned: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      }

      data.forEach(request => {
        switch (request.status) {
          case 'pending':
            stats.pending++
            break
          case 'assigned':
            stats.assigned++
            break
          case 'in_progress':
            stats.in_progress++
            break
          case 'completed':
            stats.completed++
            break
          case 'cancelled':
            stats.cancelled++
            break
        }
      })

      return stats
    } catch (error) {
      console.error('Error fetching SOS request stats:', error)
      throw error
    }
  }

  static async assignDriver(sosRequestId: string, driverId: string): Promise<DatabaseSOSRequest> {
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .update({
          driver_id: driverId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', sosRequestId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error assigning driver:', error)
      throw error
    }
  }

  static async updateStatus(sosRequestId: string, status: string): Promise<DatabaseSOSRequest> {
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sosRequestId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating SOS request status:', error)
      throw error
    }
  }

  static async getById(id: string): Promise<DatabaseSOSRequest | null> {
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
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
      const { data, error } = await supabase
        .from('sos_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching SOS requests:', error)
      throw error
    }
  }

  static async create(sosRequest: Partial<DatabaseSOSRequest>): Promise<DatabaseSOSRequest> {
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .insert([{
          ...sosRequest,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
      const { error } = await supabase
        .from('sos_requests')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting SOS request:', error)
      throw error
    }
  }
}
