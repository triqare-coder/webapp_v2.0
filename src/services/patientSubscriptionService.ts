import { supabase } from '@/lib/supabase'

// Database types
export interface DatabasePatientSubscription {
  id: string
  patient_id: string
  subscription_plan_id: string
  start_date: string
  end_date: string
  subscription_status: 'active' | 'expired' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  amount_paid: number
  payment_method?: string
  payment_gateway?: string
  transaction_id?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  patients?: {
    user_id: string
    users: {
      full_name: string
      email: string
    }
  }
  subscription_plans?: {
    name: string
    description?: string
    price: number
    duration_days: number
  }
}

// Input types for creating patient subscriptions
export interface CreatePatientSubscriptionInput {
  patient_id: string
  subscription_plan_id: string
  start_date: string
  end_date: string
  subscription_status: 'active' | 'expired' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  amount_paid: number
  payment_method?: string
  payment_gateway?: string
  transaction_id?: string
  notes?: string
}

// Input types for updating patient subscriptions
export interface UpdatePatientSubscriptionInput {
  patient_id?: string
  subscription_plan_id?: string
  start_date?: string
  end_date?: string
  subscription_status?: 'active' | 'expired' | 'cancelled'
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  amount_paid?: number
  payment_method?: string
  payment_gateway?: string
  transaction_id?: string
  notes?: string
}

export class PatientSubscriptionService {
  // Create a new patient subscription
  static async createPatientSubscription(subscriptionData: CreatePatientSubscriptionInput): Promise<{ data: DatabasePatientSubscription | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('patient_subscriptions')
        .insert([subscriptionData])
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          subscription_plans!inner(name, price, duration_days)
        `)
        .single()

      if (error) {
        console.error('Error creating patient subscription:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating patient subscription:', err)
      return { data: null, error: 'Failed to create patient subscription' }
    }
  }

  // Get all patient subscriptions with optional filtering
  static async getPatientSubscriptions(filters?: {
    patient_id?: string
    subscription_plan_id?: string
    payment_status?: string
    subscription_status?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: DatabasePatientSubscription[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('patient_subscriptions')
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          subscription_plans!inner(name, price, duration_days)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id)
      }

      if (filters?.subscription_plan_id) {
        query = query.eq('subscription_plan_id', filters.subscription_plan_id)
      }

      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status)
      }

      if (filters?.subscription_status) {
        query = query.eq('subscription_status', filters.subscription_status)
      }

      if (filters?.search) {
        query = query.or(`patients.users.full_name.ilike.%${filters.search}%,patients.users.email.ilike.%${filters.search}%,subscription_plans.name.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching patient subscriptions:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null, count: count || 0 }
    } catch (err) {
      console.error('Unexpected error fetching patient subscriptions:', err)
      return { data: null, error: 'Failed to fetch patient subscriptions' }
    }
  }

  // Get a single patient subscription by ID
  static async getPatientSubscriptionById(id: string): Promise<{ data: DatabasePatientSubscription | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('patient_subscriptions')
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          subscription_plans!inner(name, price, duration_days)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching patient subscription:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching patient subscription:', err)
      return { data: null, error: 'Failed to fetch patient subscription' }
    }
  }

  // Update a patient subscription
  static async updatePatientSubscription(id: string, subscriptionData: UpdatePatientSubscriptionInput): Promise<{ data: DatabasePatientSubscription | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('patient_subscriptions')
        .update({
          ...subscriptionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          subscription_plans!inner(name, price, duration_days)
        `)
        .single()

      if (error) {
        console.error('Error updating patient subscription:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating patient subscription:', err)
      return { data: null, error: 'Failed to update patient subscription' }
    }
  }

  // Delete a patient subscription
  static async deletePatientSubscription(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('patient_subscriptions')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting patient subscription:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      console.error('Unexpected error deleting patient subscription:', err)
      return { success: false, error: 'Failed to delete patient subscription' }
    }
  }

  // Get patient subscription statistics
  static async getPatientSubscriptionStats(): Promise<{ 
    data: { 
      total: number
      active: number
      expired: number
      cancelled: number
      totalRevenue: number
      pendingPayments: number
    } | null
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('patient_subscriptions')
        .select(`
          subscription_status,
          payment_status,
          subscription_plans!inner(price)
        `)

      if (error) {
        console.error('Error fetching patient subscription stats:', error)
        return { data: null, error: error.message }
      }

      const total = data.length
      const active = data.filter(sub => sub.subscription_status === 'active').length
      const expired = data.filter(sub => sub.subscription_status === 'expired').length
      const cancelled = data.filter(sub => sub.subscription_status === 'cancelled').length
      const totalRevenue = data
        .filter(sub => sub.payment_status === 'paid')
        .reduce((sum, sub) => sum + ((sub.subscription_plans as any)?.price || 0), 0)
      const pendingPayments = data.filter(sub => sub.payment_status === 'pending').length

      return {
        data: {
          total,
          active,
          expired,
          cancelled,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          pendingPayments
        },
        error: null
      }
    } catch (err) {
      console.error('Unexpected error fetching patient subscription stats:', err)
      return { data: null, error: 'Failed to fetch patient subscription statistics' }
    }
  }
}
