import { useState, useEffect, useCallback } from 'react'
import { TransportCompany, TransportCompanyFilters, CreateTransportCompanyData, UpdateTransportCompanyData } from '@/services/transportCompanyService'

// Hook for fetching transport companies with filters and pagination
export function useTransportCompanies(filters: TransportCompanyFilters = {}) {
  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchTransportCompanies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.is_verified !== undefined) params.append('is_verified', filters.is_verified.toString())
      if (filters.country_id) params.append('country_id', filters.country_id)
      if (filters.state_id) params.append('state_id', filters.state_id)
      if (filters.city_id) params.append('city_id', filters.city_id)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`/api/transport-companies?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transport companies')
      }

      setTransportCompanies(data.transportCompanies)
      setCount(data.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching transport companies:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.search, filters.is_verified, filters.country_id, filters.state_id, filters.city_id, filters.limit, filters.offset])

  useEffect(() => {
    fetchTransportCompanies()
  }, [fetchTransportCompanies])

  const refetch = useCallback(() => {
    fetchTransportCompanies()
  }, [fetchTransportCompanies])

  return {
    transportCompanies,
    loading,
    error,
    count,
    refetch
  }
}

// Hook for fetching a single transport company
export function useTransportCompany(id: string | null) {
  const [transportCompany, setTransportCompany] = useState<TransportCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransportCompany = useCallback(async () => {
    if (!id) {
      setTransportCompany(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/transport-companies/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transport company')
      }

      setTransportCompany(data.transportCompany)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching transport company:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTransportCompany()
  }, [fetchTransportCompany])

  const refetch = useCallback(() => {
    fetchTransportCompany()
  }, [fetchTransportCompany])

  return {
    transportCompany,
    loading,
    error,
    refetch
  }
}

// Hook for creating transport companies
export function useCreateTransportCompany() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTransportCompany = useCallback(async (data: CreateTransportCompanyData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/transport-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create transport company')
      }

      return result.transportCompany
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error creating transport company:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createTransportCompany,
    loading,
    error
  }
}

// Hook for updating transport companies
export function useUpdateTransportCompany() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTransportCompany = useCallback(async (id: string, data: UpdateTransportCompanyData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/transport-companies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transport company')
      }

      return result.transportCompany
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error updating transport company:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    updateTransportCompany,
    loading,
    error
  }
}

// Hook for deleting transport companies
export function useDeleteTransportCompany() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTransportCompany = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/transport-companies/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete transport company')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error deleting transport company:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    deleteTransportCompany,
    loading,
    error
  }
}

// Hook for transport company stats
export function useTransportCompanyStats() {
  const [stats, setStats] = useState<{
    total: number
    verified: number
    unverified: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/transport-companies/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transport company stats')
      }

      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching transport company stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refetch = useCallback(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch
  }
}
