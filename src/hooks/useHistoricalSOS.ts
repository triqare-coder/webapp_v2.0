import { useState, useEffect, useCallback } from 'react'
import { SOSService, SOSRequest } from '@/services/sosService'

interface HistoricalSOSFilters {
  status?: 'Completed' | 'Cancelled' | 'Transferred'
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'all'
  search?: string
  limit?: number
  offset?: number
}

interface HistoricalSOSStats {
  total: number
  completed: number
  cancelled: number
  transferred: number
  avgResponseTime: string
}

export function useHistoricalSOS(filters?: HistoricalSOSFilters) {
  const [data, setData] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<HistoricalSOSStats>({
    total: 0,
    completed: 0,
    cancelled: 0,
    transferred: 0,
    avgResponseTime: '00:00:00'
  })

  const fetchHistoricalSOS = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await SOSService.getHistoricalSOSRequests(filters)

      if (result.error) {
        setError(result.error)
        setData([])
        setTotal(0)
        return
      }

      const sosData = result.data || []
      setData(sosData)
      setTotal(result.total || 0)

      // Calculate statistics
      const completed = sosData.filter(sos => sos.status === 'Completed').length
      const cancelled = sosData.filter(sos => sos.status === 'Cancelled').length
      const transferred = 0 // Transferred status not available in current type

      // Calculate average response time for completed cases
      const completedCases = sosData.filter(sos => 
        sos.status === 'Completed' && 
        sos.requested_at && 
        sos.assigned_at
      )

      let avgResponseTimeMs = 0
      if (completedCases.length > 0) {
        const totalResponseTime = completedCases.reduce((sum, sos) => {
          const requestedTime = new Date(sos.requested_at).getTime()
          const assignedTime = new Date(sos.assigned_at!).getTime()
          return sum + (assignedTime - requestedTime)
        }, 0)
        avgResponseTimeMs = totalResponseTime / completedCases.length
      }

      // Convert milliseconds to HH:MM:SS format
      const avgResponseTime = formatDuration(avgResponseTimeMs)

      setStats({
        total: sosData.length,
        completed,
        cancelled,
        transferred,
        avgResponseTime
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical SOS data')
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchHistoricalSOS()
  }, [fetchHistoricalSOS])

  const refetch = useCallback(() => {
    fetchHistoricalSOS()
  }, [fetchHistoricalSOS])

  return {
    data,
    loading,
    error,
    total,
    stats,
    refetch
  }
}

// Helper function to format duration in milliseconds to HH:MM:SS
function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00:00'
  
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// Hook for getting priority color classes
export function usePriorityColor() {
  return useCallback((priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])
}

// Hook for getting status color classes
export function useStatusColor() {
  return useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'transferred':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])
}
