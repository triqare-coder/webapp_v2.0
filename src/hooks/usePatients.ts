import { useState, useEffect, useCallback } from 'react'
import { DatabasePatient, CreatePatientInput, UpdatePatientInput } from '@/services/patientService'

// Hook for fetching multiple patients
export function usePatients(filters?: {
  gender?: string
  blood_group?: string
  primary_hospital_id?: string
  country_id?: string
  state_id?: string
  city_id?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const [patients, setPatients] = useState<DatabasePatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters?.gender) params.append('gender', filters.gender)
      if (filters?.blood_group) params.append('blood_group', filters.blood_group)
      if (filters?.primary_hospital_id) params.append('primary_hospital_id', filters.primary_hospital_id)
      if (filters?.country_id) params.append('country_id', filters.country_id)
      if (filters?.state_id) params.append('state_id', filters.state_id)
      if (filters?.city_id) params.append('city_id', filters.city_id)

      // When searching, fetch more data to enable client-side filtering
      const isSearching = filters?.search && filters.search.trim()
      if (isSearching) {
        // Fetch more records when searching to enable proper client-side filtering
        params.append('limit', '1000') // Fetch up to 1000 records for search
      } else {
        // Normal pagination
        if (filters?.limit) params.append('limit', filters.limit.toString())
        if (filters?.offset) params.append('offset', filters.offset.toString())
      }

      const response = await fetch(`/api/patients?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patients')
      }

      let filteredPatients = data.patients || []
      let totalCount = data.count || 0

      // Apply client-side search filtering if search term exists
      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim()
        filteredPatients = filteredPatients.filter((patient: DatabasePatient) => {
          const fullName = patient.full_name?.toLowerCase() || ''
          const email = patient.email?.toLowerCase() || ''
          const abhaId = patient.abha_id?.toLowerCase() || ''

          return fullName.includes(searchTerm) ||
                 email.includes(searchTerm) ||
                 abhaId.includes(searchTerm)
        })

        // When searching, apply client-side pagination
        totalCount = filteredPatients.length
        if (filters?.limit && filters?.offset !== undefined) {
          const startIndex = filters.offset
          const endIndex = startIndex + filters.limit
          filteredPatients = filteredPatients.slice(startIndex, endIndex)
        }
      }

      setPatients(filteredPatients)
      setCount(totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patients')
      setPatients([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [filters?.gender, filters?.blood_group, filters?.primary_hospital_id, filters?.country_id, filters?.state_id, filters?.city_id, filters?.search, filters?.limit, filters?.offset])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  return { patients, loading, error, count, refetch: fetchPatients }
}

// Hook for fetching a single patient
export function usePatient(id: string | null) {
  const [patient, setPatient] = useState<DatabasePatient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPatient = useCallback(async () => {
    if (!id) {
      setPatient(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/patients/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patient')
      }

      setPatient(data.patient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patient')
      setPatient(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPatient()
  }, [fetchPatient])

  return { patient, loading, error, refetch: fetchPatient }
}

// Hook for patient statistics
export function usePatientStats() {
  const [stats, setStats] = useState<{
    total: number
    byGender: Record<string, number>
    byBloodGroup: Record<string, number>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/patients/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patient statistics')
      }

      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patient statistics')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}

// Hook for creating a patient
export function useCreatePatient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPatient = useCallback(async (patientData: CreatePatientInput): Promise<DatabasePatient | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create patient')
      }

      return data.patient
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createPatient, loading, error }
}

// Hook for updating a patient
export function useUpdatePatient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePatient = useCallback(async (id: string, patientData: UpdatePatientInput): Promise<DatabasePatient | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update patient')
      }

      return data.patient
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updatePatient, loading, error }
}

// Hook for deleting a patient
export function useDeletePatient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePatient = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete patient')
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deletePatient, loading, error }
}
