import { useState, useEffect, useCallback } from 'react'
import { DatabaseBillingHistory, CreateBillingHistoryInput, UpdateBillingHistoryInput, BillingHistoryService } from '@/services/billingHistoryService'

// Hook for fetching all billing history
export function useBillingHistory(filters?: {
  patient_id?: string
  subscription_id?: string
  status?: string
  payment_method?: string
  payment_gateway?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const [billingHistory, setBillingHistory] = useState<DatabaseBillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchBillingHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await BillingHistoryService.getBillingHistory(filters)
      
      if (result.error) {
        throw new Error(result.error)
      }

      setBillingHistory(result.data || [])
      setCount(result.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setBillingHistory([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [filters?.patient_id, filters?.subscription_id, filters?.status, filters?.payment_method, filters?.payment_gateway, filters?.search, filters?.limit, filters?.offset])

  useEffect(() => {
    fetchBillingHistory()
  }, [fetchBillingHistory])

  // Delete billing history function
  const deleteBillingHistory = useCallback(async (id: string) => {
    try {
      const result = await BillingHistoryService.deleteBillingHistory(id)
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      // Refresh the list after successful deletion
      await fetchBillingHistory()
      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete billing history' }
    }
  }, [fetchBillingHistory])

  return {
    billingHistory,
    loading,
    error,
    count,
    refetch: fetchBillingHistory,
    deleteBillingHistory
  }
}

// Hook for fetching a single billing history record
export function useBillingHistoryRecord(id: string | null) {
  const [billingRecord, setBillingRecord] = useState<DatabaseBillingHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBillingRecord = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const result = await BillingHistoryService.getBillingHistoryById(id)
      
      if (result.error) {
        throw new Error(result.error)
      }

      setBillingRecord(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setBillingRecord(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBillingRecord()
  }, [fetchBillingRecord])

  return {
    billingRecord,
    loading,
    error,
    refetch: fetchBillingRecord
  }
}

// Hook for billing history statistics
export function useBillingHistoryStats() {
  const [stats, setStats] = useState<{
    total: number
    totalAmount: number
    paid: number
    pending: number
    failed: number
    refunded: number
    averageAmount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await BillingHistoryService.getBillingHistoryStats()
      
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

// Hook for creating billing history
export function useCreateBillingHistory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBillingHistory = useCallback(async (billingData: CreateBillingHistoryInput) => {
    setLoading(true)
    setError(null)

    try {
      const result = await BillingHistoryService.createBillingHistory(billingData)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error, data: null }
      }

      return { success: true, error: null, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create billing history'
      setError(errorMessage)
      return { success: false, error: errorMessage, data: null }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createBillingHistory,
    loading,
    error
  }
}

// Hook for updating billing history
export function useUpdateBillingHistory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateBillingHistory = useCallback(async (id: string, billingData: UpdateBillingHistoryInput) => {
    setLoading(true)
    setError(null)

    try {
      const result = await BillingHistoryService.updateBillingHistory(id, billingData)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error, data: null }
      }

      return { success: true, error: null, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update billing history'
      setError(errorMessage)
      return { success: false, error: errorMessage, data: null }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    updateBillingHistory,
    loading,
    error
  }
}

// Hook for deleting billing history
export function useDeleteBillingHistory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteBillingHistory = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await BillingHistoryService.deleteBillingHistory(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete billing history'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    deleteBillingHistory,
    loading,
    error
  }
}
