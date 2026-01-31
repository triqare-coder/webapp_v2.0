import { supabase } from '@/lib/supabase'

// Database types
export interface DatabaseBillingHistory {
  id: string
  patient_id: string
  subscription_id: string
  amount: number
  currency: string
  payment_method: string | null
  payment_gateway: string | null
  transaction_id: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  invoice_url: string | null
  metadata: Record<string, any> | null
  created_at: string
  // Relations
  patients?: {
    user_id: string
    users: {
      full_name: string
      email: string
    }
  }
  patient_subscriptions?: {
    start_date: string
    end_date: string
    subscription_plans: {
      name: string
    }
  }
}

// Input types for creating billing history
export interface CreateBillingHistoryInput {
  patient_id: string
  subscription_id: string
  amount: number
  currency?: string
  payment_method?: string
  payment_gateway?: string
  transaction_id: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  invoice_url?: string
  metadata?: Record<string, any>
}

// Input types for updating billing history
export interface UpdateBillingHistoryInput {
  amount?: number
  currency?: string
  payment_method?: string
  payment_gateway?: string
  transaction_id?: string
  status?: 'pending' | 'paid' | 'failed' | 'refunded'
  invoice_url?: string
  metadata?: Record<string, any>
}

export class BillingHistoryService {
  // Create a new billing history record
  static async createBillingHistory(billingData: CreateBillingHistoryInput): Promise<{ data: DatabaseBillingHistory | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .insert([{
          ...billingData,
          currency: billingData.currency || 'INR'
        }])
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          patient_subscriptions!inner(
            start_date,
            end_date,
            subscription_plans!inner(name)
          )
        `)
        .single()

      if (error) {
        console.error('Error creating billing history:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating billing history:', err)
      return { data: null, error: 'Failed to create billing history' }
    }
  }

  // Get all billing history with optional filtering
  static async getBillingHistory(filters?: {
    patient_id?: string
    subscription_id?: string
    status?: string
    payment_method?: string
    payment_gateway?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: DatabaseBillingHistory[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('billing_history')
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          patient_subscriptions!inner(
            start_date,
            end_date,
            subscription_plans!inner(name)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id)
      }

      if (filters?.subscription_id) {
        query = query.eq('subscription_id', filters.subscription_id)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.payment_method) {
        query = query.eq('payment_method', filters.payment_method)
      }

      if (filters?.payment_gateway) {
        query = query.eq('payment_gateway', filters.payment_gateway)
      }

      if (filters?.search) {
        query = query.or(`patients.users.full_name.ilike.%${filters.search}%,patients.users.email.ilike.%${filters.search}%,transaction_id.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching billing history:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null, count: count || 0 }
    } catch (err) {
      console.error('Unexpected error fetching billing history:', err)
      return { data: null, error: 'Failed to fetch billing history' }
    }
  }

  // Get a single billing history record by ID
  static async getBillingHistoryById(id: string): Promise<{ data: DatabaseBillingHistory | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          patient_subscriptions!inner(
            start_date,
            end_date,
            subscription_plans!inner(name)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching billing history:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching billing history:', err)
      return { data: null, error: 'Failed to fetch billing history' }
    }
  }

  // Update a billing history record
  static async updateBillingHistory(id: string, billingData: UpdateBillingHistoryInput): Promise<{ data: DatabaseBillingHistory | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .update(billingData)
        .eq('id', id)
        .select(`
          *,
          patients!inner(
            user_id,
            users!inner(full_name, email)
          ),
          patient_subscriptions!inner(
            start_date,
            end_date,
            subscription_plans!inner(name)
          )
        `)
        .single()

      if (error) {
        console.error('Error updating billing history:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating billing history:', err)
      return { data: null, error: 'Failed to update billing history' }
    }
  }

  // Delete a billing history record
  static async deleteBillingHistory(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('billing_history')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting billing history:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      console.error('Unexpected error deleting billing history:', err)
      return { success: false, error: 'Failed to delete billing history' }
    }
  }

  // Get billing history statistics
  static async getBillingHistoryStats(): Promise<{ 
    data: { 
      total: number
      totalAmount: number
      paid: number
      pending: number
      failed: number
      refunded: number
      averageAmount: number
    } | null
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('billing_history')
        .select('status, amount')

      if (error) {
        console.error('Error fetching billing history stats:', error)
        return { data: null, error: error.message }
      }

      const total = data.length
      const totalAmount = data.reduce((sum, record) => sum + record.amount, 0)
      const paid = data.filter(record => record.status === 'paid').length
      const pending = data.filter(record => record.status === 'pending').length
      const failed = data.filter(record => record.status === 'failed').length
      const refunded = data.filter(record => record.status === 'refunded').length
      const averageAmount = total > 0 ? totalAmount / total : 0

      return {
        data: {
          total,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paid,
          pending,
          failed,
          refunded,
          averageAmount: Math.round(averageAmount * 100) / 100
        },
        error: null
      }
    } catch (err) {
      console.error('Unexpected error fetching billing history stats:', err)
      return { data: null, error: 'Failed to fetch billing history statistics' }
    }
  }
}
