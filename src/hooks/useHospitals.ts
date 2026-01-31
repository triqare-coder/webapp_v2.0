import { useState, useEffect, useCallback } from 'react'
import { DatabaseHospital, CreateHospitalInput, UpdateHospitalInput } from '@/services/hospitalService'

interface UseHospitalsOptions {
  status?: string
  hospital_type?: string
  city_id?: string
  pincode_id?: string
  search?: string
  limit?: number
  offset?: number
}

interface UseHospitalsReturn {
  hospitals: DatabaseHospital[]
  loading: boolean
  error: string | null
  count: number
  refetch: () => Promise<void>
  createHospital: (data: CreateHospitalInput) => Promise<{ success: boolean; error?: string; hospital?: DatabaseHospital }>
  updateHospital: (id: string, data: UpdateHospitalInput) => Promise<{ success: boolean; error?: string; hospital?: DatabaseHospital }>
  deleteHospital: (id: string) => Promise<{ success: boolean; error?: string }>
}

export function useHospitals(options: UseHospitalsOptions = {}): UseHospitalsReturn {
  const [hospitals, setHospitals] = useState<DatabaseHospital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      
      if (options.status && options.status !== 'all') params.append('status', options.status)
      if (options.hospital_type && options.hospital_type !== 'all') params.append('hospital_type', options.hospital_type)
      if (options.city_id && options.city_id !== 'all') params.append('city_id', options.city_id)
      if (options.pincode_id && options.pincode_id !== 'all') params.append('pincode_id', options.pincode_id)
      if (options.search) params.append('search', options.search)
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())

      const response = await fetch(`/api/hospitals?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch hospitals')
      }

      const data = await response.json()
      setHospitals(data.hospitals || [])
      setCount(data.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setHospitals([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [options.status, options.hospital_type, options.city_id, options.pincode_id, options.search, options.limit, options.offset])

  const createHospital = useCallback(async (data: CreateHospitalInput) => {
    try {
      const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || 'Failed to create hospital' }
      }

      const result = await response.json()
      
      // Refresh the hospitals list
      await fetchHospitals()
      
      return { success: true, hospital: result.hospital }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [fetchHospitals])

  const updateHospital = useCallback(async (id: string, data: UpdateHospitalInput) => {
    try {
      const response = await fetch(`/api/hospitals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || 'Failed to update hospital' }
      }

      const result = await response.json()
      
      // Update the hospital in the local state
      setHospitals(prev => prev.map(hospital => 
        hospital.id === id ? result.hospital : hospital
      ))
      
      return { success: true, hospital: result.hospital }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [])

  const deleteHospital = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/hospitals/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || 'Failed to delete hospital' }
      }

      // Remove the hospital from the local state
      setHospitals(prev => prev.filter(hospital => hospital.id !== id))
      setCount(prev => prev - 1)
      
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }, [])

  useEffect(() => {
    fetchHospitals()
  }, [fetchHospitals])

  return {
    hospitals,
    loading,
    error,
    count,
    refetch: fetchHospitals,
    createHospital,
    updateHospital,
    deleteHospital
  }
}

// Hook for getting a single hospital
export function useHospital(id: string | null) {
  const [hospital, setHospital] = useState<DatabaseHospital | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHospital = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/hospitals/${id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch hospital')
      }

      const data = await response.json()
      setHospital(data.hospital)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setHospital(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchHospital()
  }, [fetchHospital])

  return {
    hospital,
    loading,
    error,
    refetch: fetchHospital
  }
}

// Hook for hospital statistics
export function useHospitalStats() {
  const [stats, setStats] = useState<{
    total: number
    active: number
    government: number
    private: number
    specialty: number
    other: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/hospitals/stats')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch hospital statistics')
      }

      const data = await response.json()
      setStats(data.stats)
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
