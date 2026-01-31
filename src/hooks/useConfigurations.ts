import { useState, useEffect, useCallback } from 'react'
import { Configuration, CreateConfigurationInput } from '@/services/configurationService'

// Hook for fetching all configurations
export function useConfigurations() {
  const [configurations, setConfigurations] = useState<Configuration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfigurations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/configurations')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch configurations')
      }

      const data = await response.json()
      setConfigurations(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setConfigurations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigurations()
  }, [fetchConfigurations])

  return {
    configurations,
    loading,
    error,
    refetch: fetchConfigurations
  }
}

// Hook for fetching a single configuration by key
export function useConfiguration(key: string | null) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfiguration = useCallback(async () => {
    if (!key) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/configurations/${encodeURIComponent(key)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch configuration')
      }

      const data = await response.json()
      setConfiguration(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setConfiguration(null)
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    fetchConfiguration()
  }, [fetchConfiguration])

  return {
    configuration,
    loading,
    error,
    refetch: fetchConfiguration
  }
}

// Hook for saving (upsert) configurations
export function useSaveConfiguration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveConfiguration = useCallback(async (configData: CreateConfigurationInput): Promise<Configuration | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    saveConfiguration,
    loading,
    error
  }
}

// Hook for deleting configurations
export function useDeleteConfiguration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteConfiguration = useCallback(async (key: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/configurations/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete configuration')
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
    deleteConfiguration,
    loading,
    error
  }
}

