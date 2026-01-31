import { useState, useCallback } from 'react'
import { LocationService, DatabaseCountry, DatabaseState, DatabaseCity, DatabasePincode } from '@/services/locationService'

// Countries hooks
export function useCountryManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCountry = useCallback(async (name: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.createCountry(name)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create country'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCountry = useCallback(async (id: string, name: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.updateCountry(id, name)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update country'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCountry = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.deleteCountry(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete country'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const getCountryById = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.getCountryById(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch country'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createCountry,
    updateCountry,
    deleteCountry,
    getCountryById,
    loading,
    error
  }
}

// States hooks
export function useStateManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createState = useCallback(async (countryId: string, name: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.createState(countryId, name)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create state'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateState = useCallback(async (id: string, countryId: string, name: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.updateState(id, countryId, name)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update state'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteState = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.deleteState(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete state'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const getStateById = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.getStateById(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch state'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createState,
    updateState,
    deleteState,
    getStateById,
    loading,
    error
  }
}

// Cities hooks
export function useCityManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCity = useCallback(async (stateId: string, name: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.createCity(stateId, name)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create city'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCity = useCallback(async (id: string, stateId: string, name: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.updateCity(id, stateId, name)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update city'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCity = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.deleteCity(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete city'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const getCityById = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.getCityById(id)
      
      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch city'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createCity,
    updateCity,
    deleteCity,
    getCityById,
    loading,
    error
  }
}

// Pincodes hooks
export function usePincodeManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPincode = useCallback(async (cityId: string, code: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.createPincode(cityId, code)

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pincode'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePincode = useCallback(async (id: string, cityId: string, code: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.updatePincode(id, cityId, code)

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update pincode'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePincode = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.deletePincode(id)

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete pincode'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const getPincodeById = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const result = await LocationService.getPincodeById(id)

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      return { success: true, data: result.data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pincode'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createPincode,
    updatePincode,
    deletePincode,
    getPincodeById,
    loading,
    error
  }
}
