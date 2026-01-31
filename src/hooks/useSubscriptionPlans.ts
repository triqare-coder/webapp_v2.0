import { useState, useEffect, useCallback } from 'react'
import { DatabaseSubscriptionPlan, CreateSubscriptionPlanInput, UpdateSubscriptionPlanInput } from '@/services/subscriptionPlanService'

// Hook for fetching all subscription plans
export function useSubscriptionPlans(filters?: {
  is_active?: boolean
  search?: string
  limit?: number
  offset?: number
}) {
  const [subscriptionPlans, setSubscriptionPlans] = useState<DatabaseSubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchSubscriptionPlans = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (filters?.is_active !== undefined) {
        params.append('is_active', filters.is_active.toString())
      }
      if (filters?.search) {
        params.append('search', filters.search)
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString())
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString())
      }

      const response = await fetch(`/api/subscription-plans?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch subscription plans')
      }

      const data = await response.json()
      setSubscriptionPlans(data.data || [])
      setCount(data.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSubscriptionPlans([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [filters?.is_active, filters?.search, filters?.limit, filters?.offset])

  useEffect(() => {
    fetchSubscriptionPlans()
  }, [fetchSubscriptionPlans])

  return {
    subscriptionPlans,
    loading,
    error,
    count,
    refetch: fetchSubscriptionPlans
  }
}

// Hook for fetching a single subscription plan
export function useSubscriptionPlan(id: string | null) {
  const [subscriptionPlan, setSubscriptionPlan] = useState<DatabaseSubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptionPlan = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/subscription-plans/${id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch subscription plan')
      }

      const data = await response.json()
      setSubscriptionPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSubscriptionPlan(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSubscriptionPlan()
  }, [fetchSubscriptionPlan])

  return {
    subscriptionPlan,
    loading,
    error,
    refetch: fetchSubscriptionPlan
  }
}

// Hook for subscription plan statistics
export function useSubscriptionPlanStats() {
  const [stats, setStats] = useState<{
    total: number
    active: number
    inactive: number
    averagePrice: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscription-plans/stats')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch subscription plan statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

// Hook for creating subscription plans
export function useCreateSubscriptionPlan() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSubscriptionPlan = useCallback(async (planData: CreateSubscriptionPlanInput): Promise<DatabaseSubscriptionPlan | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscription-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription plan')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createSubscriptionPlan,
    loading,
    error
  }
}

// Hook for updating subscription plans
export function useUpdateSubscriptionPlan() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSubscriptionPlan = useCallback(async (id: string, planData: UpdateSubscriptionPlanInput): Promise<DatabaseSubscriptionPlan | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/subscription-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update subscription plan')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    updateSubscriptionPlan,
    loading,
    error
  }
}

// Hook for deleting subscription plans
export function useDeleteSubscriptionPlan() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteSubscriptionPlan = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/subscription-plans/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete subscription plan')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    deleteSubscriptionPlan,
    loading,
    error
  }
}
