import { supabase } from '@/lib/supabase'

// Database types
export interface DatabaseSubscriptionPlan {
  id: string
  name: string
  description: string | null
  price: number
  duration_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Input types for creating subscription plans
export interface CreateSubscriptionPlanInput {
  name: string
  description?: string
  price: number
  duration_days: number
  is_active?: boolean
}

// Input types for updating subscription plans
export interface UpdateSubscriptionPlanInput {
  name?: string
  description?: string
  price?: number
  duration_days?: number
  is_active?: boolean
}

export class SubscriptionPlanService {
  // Create a new subscription plan
  static async createSubscriptionPlan(planData: CreateSubscriptionPlanInput): Promise<{ data: DatabaseSubscriptionPlan | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([{
          ...planData,
          is_active: planData.is_active ?? true
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating subscription plan:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating subscription plan:', err)
      return { data: null, error: 'Failed to create subscription plan' }
    }
  }

  // Get all subscription plans with optional filtering
  static async getSubscriptionPlans(filters?: {
    is_active?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: DatabaseSubscriptionPlan[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('subscription_plans')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching subscription plans:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null, count: count || 0 }
    } catch (err) {
      console.error('Unexpected error fetching subscription plans:', err)
      return { data: null, error: 'Failed to fetch subscription plans' }
    }
  }

  // Get a single subscription plan by ID
  static async getSubscriptionPlanById(id: string): Promise<{ data: DatabaseSubscriptionPlan | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching subscription plan:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching subscription plan:', err)
      return { data: null, error: 'Failed to fetch subscription plan' }
    }
  }

  // Update a subscription plan
  static async updateSubscriptionPlan(id: string, planData: UpdateSubscriptionPlanInput): Promise<{ data: DatabaseSubscriptionPlan | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({
          ...planData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating subscription plan:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating subscription plan:', err)
      return { data: null, error: 'Failed to update subscription plan' }
    }
  }

  // Delete a subscription plan
  static async deleteSubscriptionPlan(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting subscription plan:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting subscription plan:', err)
      return { error: 'Failed to delete subscription plan' }
    }
  }

  // Get subscription plan statistics
  static async getSubscriptionPlanStats(): Promise<{ 
    data: { 
      total: number
      active: number
      inactive: number
      averagePrice: number
    } | null
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('is_active, price')

      if (error) {
        console.error('Error fetching subscription plan stats:', error)
        return { data: null, error: error.message }
      }

      const total = data.length
      const active = data.filter(plan => plan.is_active).length
      const inactive = total - active
      const averagePrice = total > 0 ? data.reduce((sum, plan) => sum + plan.price, 0) / total : 0

      return {
        data: {
          total,
          active,
          inactive,
          averagePrice: Math.round(averagePrice * 100) / 100
        },
        error: null
      }
    } catch (err) {
      console.error('Unexpected error fetching subscription plan stats:', err)
      return { data: null, error: 'Failed to fetch subscription plan statistics' }
    }
  }
}
