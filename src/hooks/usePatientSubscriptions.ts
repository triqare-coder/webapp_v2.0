import { useState, useEffect, useCallback } from 'react'
import { DatabasePatientSubscription, CreatePatientSubscriptionInput, UpdatePatientSubscriptionInput, PatientSubscriptionService } from '@/services/patientSubscriptionService'

// Hook for fetching all patient subscriptions
export function usePatientSubscriptions(filters?: {
  patient_id?: string
  subscription_plan_id?: string
  payment_status?: string
  subscription_status?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const [patientSubscriptions, setPatientSubscriptions] = useState<DatabasePatientSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchPatientSubscriptions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await PatientSubscriptionService.getPatientSubscriptions(filters)
      
      if (result.error) {
        throw new Error(result.error)
      }

      setPatientSubscriptions(result.data || [])
      setCount(result.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setPatientSubscriptions([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [filters?.patient_id, filters?.subscription_plan_id, filters?.payment_status, filters?.subscription_status, filters?.search, filters?.limit, filters?.offset])

  useEffect(() => {
    fetchPatientSubscriptions()
  }, [fetchPatientSubscriptions])

  // Delete patient subscription function
  const deletePatientSubscription = useCallback(async (id: string) => {
    try {
      const result = await PatientSubscriptionService.deletePatientSubscription(id)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      // Refresh the list after successful deletion
      await fetchPatientSubscriptions()
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete patient subscription' }
    }
  }, [fetchPatientSubscriptions])

  return {
    patientSubscriptions,
    loading,
    error,
    count,
    refetch: fetchPatientSubscriptions,
    deletePatientSubscription
  }
}

// Hook for fetching a single patient subscription
export function usePatientSubscription(id: string | null) {
  const [patientSubscription, setPatientSubscription] = useState<DatabasePatientSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPatientSubscription = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const result = await PatientSubscriptionService.getPatientSubscriptionById(id)
      
      if (result.error) {
        throw new Error(result.error)
      }

      setPatientSubscription(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setPatientSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPatientSubscription()
  }, [fetchPatientSubscription])

  return {
    patientSubscription,
    loading,
    error,
    refetch: fetchPatientSubscription
  }
}

// Hook for patient subscription statistics
export function usePatientSubscriptionStats() {
  const [stats, setStats] = useState<{
    total: number
    active: number
    expired: number
    cancelled: number
    totalRevenue: number
    pendingPayments: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await PatientSubscriptionService.getPatientSubscriptionStats()
      
      if (result.error) {
        throw new Error(result.error)
      }

      setStats(result.data)
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

// Hook for creating patient subscriptions
export function useCreatePatientSubscription() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPatientSubscription = useCallback(async (subscriptionData: CreatePatientSubscriptionInput) => {
    setLoading(true)
    setError(null)

    try {
      const result = await PatientSubscriptionService.createPatientSubscription(subscriptionData)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error, data: null }
      }

      return { success: true, error: null, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create patient subscription'
      setError(errorMessage)
      return { success: false, error: errorMessage, data: null }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createPatientSubscription,
    loading,
    error
  }
}

// Hook for updating patient subscriptions
export function useUpdatePatientSubscription() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePatientSubscription = useCallback(async (id: string, subscriptionData: UpdatePatientSubscriptionInput) => {
    setLoading(true)
    setError(null)

    try {
      const result = await PatientSubscriptionService.updatePatientSubscription(id, subscriptionData)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error, data: null }
      }

      return { success: true, error: null, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update patient subscription'
      setError(errorMessage)
      return { success: false, error: errorMessage, data: null }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    updatePatientSubscription,
    loading,
    error
  }
}

// Hook for deleting patient subscriptions
export function useDeletePatientSubscription() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePatientSubscription = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await PatientSubscriptionService.deletePatientSubscription(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete patient subscription'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    deletePatientSubscription,
    loading,
    error
  }
}
