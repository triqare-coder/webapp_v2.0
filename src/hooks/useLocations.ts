import { useState, useEffect, useCallback } from 'react'
import { DatabaseCountry, DatabaseState, DatabaseCity, DatabasePincode } from '@/services/locationService'

// Hook for countries
export function useCountries() {
  const [countries, setCountries] = useState<DatabaseCountry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCountries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/locations/countries')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch countries')
      }

      const data = await response.json()
      setCountries(data.countries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCountries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCountries()
  }, [fetchCountries])

  return {
    countries,
    loading,
    error,
    refetch: fetchCountries
  }
}

// Hook for states
export function useStates(countryId?: string) {
  const [states, setStates] = useState<DatabaseState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStates = useCallback(async () => {
    if (!countryId) {
      setStates([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('country_id', countryId)

      const response = await fetch(`/api/locations/states?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch states')
      }

      const data = await response.json()
      setStates(data.states || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStates([])
    } finally {
      setLoading(false)
    }
  }, [countryId])

  useEffect(() => {
    fetchStates()
  }, [fetchStates])

  return {
    states,
    loading,
    error,
    refetch: fetchStates
  }
}

// Hook for cities
export function useCities(stateId?: string) {
  const [cities, setCities] = useState<DatabaseCity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCities = useCallback(async () => {
    if (!stateId) {
      setCities([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('state_id', stateId)

      const response = await fetch(`/api/locations/cities?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch cities')
      }

      const data = await response.json()
      setCities(data.cities || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCities([])
    } finally {
      setLoading(false)
    }
  }, [stateId])

  useEffect(() => {
    fetchCities()
  }, [fetchCities])

  return {
    cities,
    loading,
    error,
    refetch: fetchCities
  }
}

// Hook for pincodes
export function usePincodes(cityId?: string) {
  const [pincodes, setPincodes] = useState<DatabasePincode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPincodes = useCallback(async () => {
    if (!cityId) {
      setPincodes([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('city_id', cityId)

      const response = await fetch(`/api/locations/pincodes?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch pincodes')
      }

      const data = await response.json()
      setPincodes(data.pincodes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setPincodes([])
    } finally {
      setLoading(false)
    }
  }, [cityId])

  useEffect(() => {
    fetchPincodes()
  }, [fetchPincodes])

  return {
    pincodes,
    loading,
    error,
    refetch: fetchPincodes
  }
}

// Hook for all locations (for admin purposes)
export function useAllLocations() {
  const [countries, setCountries] = useState<DatabaseCountry[]>([])
  const [states, setStates] = useState<DatabaseState[]>([])
  const [cities, setCities] = useState<DatabaseCity[]>([])
  const [pincodes, setPincodes] = useState<DatabasePincode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllLocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [countriesRes, statesRes, citiesRes, pincodesRes] = await Promise.all([
        fetch('/api/locations/countries'),
        fetch('/api/locations/states'),
        fetch('/api/locations/cities'),
        fetch('/api/locations/pincodes')
      ])

      if (!countriesRes.ok || !statesRes.ok || !citiesRes.ok || !pincodesRes.ok) {
        throw new Error('Failed to fetch location data')
      }

      const [countriesData, statesData, citiesData, pincodesData] = await Promise.all([
        countriesRes.json(),
        statesRes.json(),
        citiesRes.json(),
        pincodesRes.json()
      ])

      setCountries(countriesData.countries || [])
      setStates(statesData.states || [])
      setCities(citiesData.cities || [])
      setPincodes(pincodesData.pincodes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCountries([])
      setStates([])
      setCities([])
      setPincodes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllLocations()
  }, [fetchAllLocations])

  return {
    countries,
    states,
    cities,
    pincodes,
    loading,
    error,
    refetch: fetchAllLocations
  }
}
