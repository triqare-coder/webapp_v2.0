import { supabase } from '@/lib/supabase'
import { Hospital } from '@/types'

// Database types for hospital
export interface DatabaseHospital {
  id: string
  name: string
  hospital_type: 'government' | 'private' | 'specialty' | 'other'
  address_line: string
  phone: string
  email?: string
  website?: string
  emergency_contact_person: string
  emergency_contact_phone: string
  emergency_contact_email?: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  latitude?: number
  longitude?: number
  general_operating_hours?: string
  emergency_department_hours?: string
  additional_notes?: string
  status: 'active' | 'inactive' | 'under_review' | 'suspended'
  created_at: string
  updated_at: string
}

// Hospital creation input type
export interface CreateHospitalInput {
  name: string
  hospital_type: 'government' | 'private' | 'specialty' | 'other'
  address_line: string
  phone: string
  email?: string
  website?: string
  emergency_contact_person: string
  emergency_contact_phone: string
  emergency_contact_email?: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  latitude?: number
  longitude?: number
  general_operating_hours?: string
  emergency_department_hours?: string
  additional_notes?: string
  status?: 'active' | 'inactive' | 'under_review' | 'suspended'
}

// Hospital update input type
export interface UpdateHospitalInput {
  name?: string
  hospital_type?: 'government' | 'private' | 'specialty' | 'other'
  address_line?: string
  phone?: string
  email?: string
  website?: string
  emergency_contact_person?: string
  emergency_contact_phone?: string
  emergency_contact_email?: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  latitude?: number
  longitude?: number
  general_operating_hours?: string
  emergency_department_hours?: string
  additional_notes?: string
  status?: 'active' | 'inactive' | 'under_review' | 'suspended'
}

export class HospitalService {
  // Create a new hospital
  static async createHospital(hospitalData: CreateHospitalInput): Promise<{ data: DatabaseHospital | null; error: string | null }> {
    try {
      // Clean the data - remove empty strings for UUID fields and convert numeric strings
      const cleanedData = {
        ...hospitalData,
        status: hospitalData.status || 'active',
        // Only include location IDs if they are not empty strings
        country_id: hospitalData.country_id || null,
        state_id: hospitalData.state_id || null,
        city_id: hospitalData.city_id || null,
        pincode_id: hospitalData.pincode_id || null,
        // Convert latitude and longitude to numbers if provided
        latitude: hospitalData.latitude ? parseFloat(hospitalData.latitude.toString()) : null,
        longitude: hospitalData.longitude ? parseFloat(hospitalData.longitude.toString()) : null
      }

      // Remove null values to avoid inserting them
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === null || cleanedData[key as keyof typeof cleanedData] === '') {
          delete cleanedData[key as keyof typeof cleanedData]
        }
      })

      const { data, error } = await supabase
        .from('hospitals')
        .insert([cleanedData])
        .select()
        .single()

      if (error) {
        console.error('Error creating hospital:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating hospital:', err)
      return { data: null, error: 'Failed to create hospital' }
    }
  }

  // Get all hospitals with optional filtering
  static async getHospitals(filters?: {
    status?: string
    hospital_type?: string
    city_id?: string
    pincode_id?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: DatabaseHospital[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('hospitals')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.hospital_type && filters.hospital_type !== 'all') {
        query = query.eq('hospital_type', filters.hospital_type)
      }

      if (filters?.city_id && filters.city_id !== 'all') {
        query = query.eq('city_id', filters.city_id)
      }

      if (filters?.pincode_id && filters.pincode_id !== 'all') {
        query = query.eq('pincode_id', filters.pincode_id)
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,address_line.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching hospitals:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null, count: count || 0 }
    } catch (err) {
      console.error('Unexpected error fetching hospitals:', err)
      return { data: null, error: 'Failed to fetch hospitals' }
    }
  }

  // Get a single hospital by ID
  static async getHospitalById(id: string): Promise<{ data: DatabaseHospital | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching hospital:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching hospital:', err)
      return { data: null, error: 'Failed to fetch hospital' }
    }
  }

  // Update a hospital
  static async updateHospital(id: string, hospitalData: UpdateHospitalInput): Promise<{ data: DatabaseHospital | null; error: string | null }> {
    try {
      // Clean the data - remove empty strings for UUID fields and convert numeric strings
      const cleanedData = {
        ...hospitalData,
        updated_at: new Date().toISOString(),
        // Only include location IDs if they are not empty strings
        country_id: hospitalData.country_id || null,
        state_id: hospitalData.state_id || null,
        city_id: hospitalData.city_id || null,
        pincode_id: hospitalData.pincode_id || null,
        // Convert latitude and longitude to numbers if provided
        latitude: hospitalData.latitude ? parseFloat(hospitalData.latitude.toString()) : null,
        longitude: hospitalData.longitude ? parseFloat(hospitalData.longitude.toString()) : null
      }

      // Remove null values and empty strings to avoid updating them
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key as keyof typeof cleanedData] === null || cleanedData[key as keyof typeof cleanedData] === '') {
          delete cleanedData[key as keyof typeof cleanedData]
        }
      })

      const { data, error } = await supabase
        .from('hospitals')
        .update(cleanedData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating hospital:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating hospital:', err)
      return { data: null, error: 'Failed to update hospital' }
    }
  }

  // Delete a hospital
  static async deleteHospital(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting hospital:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting hospital:', err)
      return { error: 'Failed to delete hospital' }
    }
  }

  // Search hospitals by name or address
  static async searchHospitals(query: string, limit = 10): Promise<{ data: DatabaseHospital[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .or(`name.ilike.%${query}%,address_line.ilike.%${query}%`)
        .eq('status', 'active')
        .limit(limit)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error searching hospitals:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error searching hospitals:', err)
      return { data: null, error: 'Failed to search hospitals' }
    }
  }

  // Get hospital statistics
  static async getHospitalStats(): Promise<{ 
    data: { 
      total: number
      active: number
      government: number
      private: number
      specialty: number
      other: number
    } | null
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('status, hospital_type')

      if (error) {
        console.error('Error fetching hospital stats:', error)
        return { data: null, error: error.message }
      }

      const stats = {
        total: data.length,
        active: data.filter(h => h.status === 'active').length,
        government: data.filter(h => h.hospital_type === 'government').length,
        private: data.filter(h => h.hospital_type === 'private').length,
        specialty: data.filter(h => h.hospital_type === 'specialty').length,
        other: data.filter(h => h.hospital_type === 'other').length
      }

      return { data: stats, error: null }
    } catch (err) {
      console.error('Unexpected error fetching hospital stats:', err)
      return { data: null, error: 'Failed to fetch hospital statistics' }
    }
  }
}
