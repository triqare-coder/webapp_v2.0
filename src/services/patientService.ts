import { supabase } from '@/lib/supabase'

// Database types for patient based on new schema
export interface DatabasePatient {
  user_id: string // Primary key referencing users(id)
  dob?: string
  gender?: 'Male' | 'Female' | 'Other'
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
  allergies?: string
  abha_id?: string
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_valid_till?: string
  primary_hospital_id?: string
  secondary_hospital_id?: string
  latitude?: number
  longitude?: number
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  address_line?: string
  // User data from join
  full_name?: string
  email?: string
  role?: string
  created_at?: string
  updated_at?: string
  // Location data from joins
  country_name?: string
  state_name?: string
  city_name?: string
  pincode_code?: string
  // Hospital data from joins
  primary_hospital_name?: string
  secondary_hospital_name?: string
  // Emergency contacts count
  emergency_contacts_count?: number
}

// Input types for creating/updating patients
export interface CreatePatientInput {
  user_id: string
  dob?: string
  gender?: 'Male' | 'Female' | 'Other'
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
  allergies?: string
  abha_id?: string
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_valid_till?: string
  primary_hospital_id?: string
  secondary_hospital_id?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  latitude?: number
  longitude?: number
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  address_line?: string
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {}

export class PatientService {
  // Create a new patient
  static async createPatient(patientData: CreatePatientInput): Promise<{ data: DatabasePatient | null; error: string | null }> {
    try {
      // Clean the data - remove empty strings for UUID fields
      const cleanedData = {
        ...patientData,
        primary_hospital_id: patientData.primary_hospital_id || null,
        secondary_hospital_id: patientData.secondary_hospital_id || null,
        country_id: patientData.country_id || null,
        state_id: patientData.state_id || null,
        city_id: patientData.city_id || null,
        pincode_id: patientData.pincode_id || null,
      }

      const { data, error } = await supabase
        .from('patients')
        .insert([cleanedData])
        .select(`
          *,
          users!inner(full_name, email, role, created_at, updated_at)
        `)
        .single()

      if (error) {
        console.error('Error creating patient:', error)
        return { data: null, error: error.message }
      }

      // Flatten the user data
      const flattenedData = {
        ...data,
        full_name: data.users?.full_name,
        email: data.users?.email,
        role: data.users?.role,
        created_at: data.users?.created_at,
        updated_at: data.users?.updated_at,
      }
      delete flattenedData.users

      return { data: flattenedData, error: null }
    } catch (err) {
      console.error('Unexpected error creating patient:', err)
      return { data: null, error: 'Failed to create patient' }
    }
  }

  // Get all patients with optional filtering
  static async getPatients(filters?: {
    gender?: string
    blood_group?: string
    primary_hospital_id?: string
    country_id?: string
    state_id?: string
    city_id?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: DatabasePatient[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('patients')
        .select(`
          *,
          users!inner(full_name, email, role, created_at, updated_at),
          countries(name),
          states(name),
          cities(name),
          pincodes(code),
          hospitals_primary:hospitals!primary_hospital_id(name),
          hospitals_secondary:hospitals!secondary_hospital_id(name),
          emergency_contacts(count)
        `, { count: 'exact' })

      // Apply filters
      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender)
      }

      if (filters?.blood_group && filters.blood_group !== 'all') {
        query = query.eq('blood_group', filters.blood_group)
      }

      if (filters?.primary_hospital_id && filters.primary_hospital_id !== 'all') {
        query = query.eq('primary_hospital_id', filters.primary_hospital_id)
      }

      if (filters?.country_id && filters.country_id !== 'all') {
        query = query.eq('country_id', filters.country_id)
      }

      if (filters?.state_id && filters.state_id !== 'all') {
        query = query.eq('state_id', filters.state_id)
      }

      if (filters?.city_id && filters.city_id !== 'all') {
        query = query.eq('city_id', filters.city_id)
      }

      // Note: Search will be implemented client-side for now due to Supabase limitations with joined table searches
      // The search parameter is still accepted for future server-side implementation

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      query = query.order('users(created_at)', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching patients:', error)
        return { data: null, error: error.message }
      }

      // Flatten the joined data
      const flattenedData = data?.map(patient => ({
        ...patient,
        full_name: patient.users?.full_name,
        email: patient.users?.email,
        role: patient.users?.role,
        created_at: patient.users?.created_at,
        updated_at: patient.users?.updated_at,
        country_name: patient.countries?.name,
        state_name: patient.states?.name,
        city_name: patient.cities?.name,
        pincode_code: patient.pincodes?.code,
        primary_hospital_name: patient.hospitals_primary?.name,
        secondary_hospital_name: patient.hospitals_secondary?.name,
        emergency_contacts_count: patient.emergency_contacts?.length || 0,
      })) || []

      // Clean up the nested objects
      flattenedData.forEach(patient => {
        delete patient.users
        delete patient.countries
        delete patient.states
        delete patient.cities
        delete patient.pincodes
        delete patient.hospitals_primary
        delete patient.hospitals_secondary
        delete patient.emergency_contacts
      })

      return { data: flattenedData, error: null, count: count || 0 }
    } catch (err) {
      console.error('Unexpected error fetching patients:', err)
      return { data: null, error: 'Failed to fetch patients' }
    }
  }

  // Get a single patient by user_id
  static async getPatientById(userId: string): Promise<{ data: DatabasePatient | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          users!inner(full_name, email, role, created_at, updated_at),
          countries(name),
          states(name),
          cities(name),
          pincodes(code),
          hospitals_primary:hospitals!primary_hospital_id(name),
          hospitals_secondary:hospitals!secondary_hospital_id(name)
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching patient:', error)
        return { data: null, error: error.message }
      }

      // Flatten the joined data
      const flattenedData = {
        ...data,
        full_name: data.users?.full_name,
        email: data.users?.email,
        role: data.users?.role,
        created_at: data.users?.created_at,
        updated_at: data.users?.updated_at,
        country_name: data.countries?.name,
        state_name: data.states?.name,
        city_name: data.cities?.name,
        pincode_code: data.pincodes?.code,
        primary_hospital_name: data.hospitals_primary?.name,
        secondary_hospital_name: data.hospitals_secondary?.name,
      }

      // Clean up the nested objects
      delete flattenedData.users
      delete flattenedData.countries
      delete flattenedData.states
      delete flattenedData.cities
      delete flattenedData.pincodes
      delete flattenedData.hospitals_primary
      delete flattenedData.hospitals_secondary

      return { data: flattenedData, error: null }
    } catch (err) {
      console.error('Unexpected error fetching patient:', err)
      return { data: null, error: 'Failed to fetch patient' }
    }
  }

  // Update a patient
  static async updatePatient(userId: string, patientData: UpdatePatientInput): Promise<{ data: DatabasePatient | null; error: string | null }> {
    try {
      // Clean the data - remove empty strings for UUID fields
      const cleanedData = {
        ...patientData,
        primary_hospital_id: patientData.primary_hospital_id || null,
        secondary_hospital_id: patientData.secondary_hospital_id || null,
        country_id: patientData.country_id || null,
        state_id: patientData.state_id || null,
        city_id: patientData.city_id || null,
        pincode_id: patientData.pincode_id || null,
      }

      const { data, error } = await supabase
        .from('patients')
        .update(cleanedData)
        .eq('user_id', userId)
        .select(`
          *,
          users!inner(full_name, email, role, created_at, updated_at),
          countries(name),
          states(name),
          cities(name),
          pincodes(code),
          hospitals_primary:hospitals!primary_hospital_id(name),
          hospitals_secondary:hospitals!secondary_hospital_id(name)
        `)
        .single()

      if (error) {
        console.error('Error updating patient:', error)
        return { data: null, error: error.message }
      }

      // Flatten the joined data
      const flattenedData = {
        ...data,
        full_name: data.users?.full_name,
        email: data.users?.email,
        role: data.users?.role,
        created_at: data.users?.created_at,
        updated_at: data.users?.updated_at,
        country_name: data.countries?.name,
        state_name: data.states?.name,
        city_name: data.cities?.name,
        pincode_code: data.pincodes?.code,
        primary_hospital_name: data.hospitals_primary?.name,
        secondary_hospital_name: data.hospitals_secondary?.name,
      }

      // Clean up the nested objects
      delete flattenedData.users
      delete flattenedData.countries
      delete flattenedData.states
      delete flattenedData.cities
      delete flattenedData.pincodes
      delete flattenedData.hospitals_primary
      delete flattenedData.hospitals_secondary

      return { data: flattenedData, error: null }
    } catch (err) {
      console.error('Unexpected error updating patient:', err)
      return { data: null, error: 'Failed to update patient' }
    }
  }

  // Delete a patient
  static async deletePatient(userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting patient:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting patient:', err)
      return { error: 'Failed to delete patient' }
    }
  }

  // Get patient statistics
  static async getPatientStats(): Promise<{ data: { total: number; byGender: Record<string, number>; byBloodGroup: Record<string, number> } | null; error: string | null }> {
    try {
      // Get total count
      const { count: total, error: totalError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })

      if (totalError) {
        console.error('Error fetching total patients:', totalError)
        return { data: null, error: totalError.message }
      }

      // Get gender distribution
      const { data: genderData, error: genderError } = await supabase
        .from('patients')
        .select('gender')
        .not('gender', 'is', null)

      if (genderError) {
        console.error('Error fetching gender data:', genderError)
        return { data: null, error: genderError.message }
      }

      const byGender = genderData?.reduce((acc: Record<string, number>, patient) => {
        if (patient.gender) {
          acc[patient.gender] = (acc[patient.gender] || 0) + 1
        }
        return acc
      }, {}) || {}

      // Get blood group distribution
      const { data: bloodGroupData, error: bloodGroupError } = await supabase
        .from('patients')
        .select('blood_group')
        .not('blood_group', 'is', null)

      if (bloodGroupError) {
        console.error('Error fetching blood group data:', bloodGroupError)
        return { data: null, error: bloodGroupError.message }
      }

      const byBloodGroup = bloodGroupData?.reduce((acc: Record<string, number>, patient) => {
        if (patient.blood_group) {
          acc[patient.blood_group] = (acc[patient.blood_group] || 0) + 1
        }
        return acc
      }, {}) || {}

      return {
        data: {
          total: total || 0,
          byGender,
          byBloodGroup
        },
        error: null
      }
    } catch (err) {
      console.error('Unexpected error fetching patient stats:', err)
      return { data: null, error: 'Failed to fetch patient statistics' }
    }
  }
}
