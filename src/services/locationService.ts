import { supabase } from '@/lib/supabase'

// Database types for location entities
export interface DatabaseCountry {
  id: string
  name: string
}

export interface DatabaseState {
  id: string
  country_id: string
  name: string
}

export interface DatabaseCity {
  id: string
  state_id: string
  name: string
}

export interface DatabasePincode {
  id: string
  city_id: string
  code: string
}

export class LocationService {
  // Get all countries
  static async getCountries(): Promise<{ data: DatabaseCountry[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching countries:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching countries:', err)
      return { data: null, error: 'Failed to fetch countries' }
    }
  }

  // Get states by country ID
  static async getStatesByCountry(countryId: string): Promise<{ data: DatabaseState[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .eq('country_id', countryId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching states:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching states:', err)
      return { data: null, error: 'Failed to fetch states' }
    }
  }

  // Get cities by state ID
  static async getCitiesByState(stateId: string): Promise<{ data: DatabaseCity[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('state_id', stateId)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching cities:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching cities:', err)
      return { data: null, error: 'Failed to fetch cities' }
    }
  }

  // Get pincodes by city ID
  static async getPincodesByCity(cityId: string): Promise<{ data: DatabasePincode[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pincodes')
        .select('*')
        .eq('city_id', cityId)
        .order('code', { ascending: true })

      if (error) {
        console.error('Error fetching pincodes:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching pincodes:', err)
      return { data: null, error: 'Failed to fetch pincodes' }
    }
  }

  // Get all states (for admin purposes)
  static async getAllStates(): Promise<{ data: DatabaseState[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching all states:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching all states:', err)
      return { data: null, error: 'Failed to fetch all states' }
    }
  }

  // Get all cities (for admin purposes)
  static async getAllCities(): Promise<{ data: DatabaseCity[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching all cities:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching all cities:', err)
      return { data: null, error: 'Failed to fetch all cities' }
    }
  }

  // Get all pincodes (for admin purposes)
  static async getAllPincodes(): Promise<{ data: DatabasePincode[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pincodes')
        .select('*')
        .order('code', { ascending: true })

      if (error) {
        console.error('Error fetching all pincodes:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching all pincodes:', err)
      return { data: null, error: 'Failed to fetch all pincodes' }
    }
  }

  // Create a new country
  static async createCountry(name: string): Promise<{ data: DatabaseCountry | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .insert([{ name }])
        .select()
        .single()

      if (error) {
        console.error('Error creating country:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating country:', err)
      return { data: null, error: 'Failed to create country' }
    }
  }

  // Create a new state
  static async createState(countryId: string, name: string): Promise<{ data: DatabaseState | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('states')
        .insert([{ country_id: countryId, name }])
        .select()
        .single()

      if (error) {
        console.error('Error creating state:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating state:', err)
      return { data: null, error: 'Failed to create state' }
    }
  }

  // Create a new city
  static async createCity(stateId: string, name: string): Promise<{ data: DatabaseCity | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert([{ state_id: stateId, name }])
        .select()
        .single()

      if (error) {
        console.error('Error creating city:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating city:', err)
      return { data: null, error: 'Failed to create city' }
    }
  }

  // Create a new pincode
  static async createPincode(cityId: string, code: string): Promise<{ data: DatabasePincode | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pincodes')
        .insert([{ city_id: cityId, code }])
        .select()
        .single()

      if (error) {
        console.error('Error creating pincode:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error creating pincode:', err)
      return { data: null, error: 'Failed to create pincode' }
    }
  }

  // Update methods
  static async updateCountry(id: string, name: string): Promise<{ data: DatabaseCountry | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating country:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating country:', err)
      return { data: null, error: 'Failed to update country' }
    }
  }

  static async updateState(id: string, countryId: string, name: string): Promise<{ data: DatabaseState | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('states')
        .update({ country_id: countryId, name })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating state:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating state:', err)
      return { data: null, error: 'Failed to update state' }
    }
  }

  static async updateCity(id: string, stateId: string, name: string): Promise<{ data: DatabaseCity | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .update({ state_id: stateId, name })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating city:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating city:', err)
      return { data: null, error: 'Failed to update city' }
    }
  }

  static async updatePincode(id: string, cityId: string, code: string): Promise<{ data: DatabasePincode | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pincodes')
        .update({ city_id: cityId, code })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating pincode:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error updating pincode:', err)
      return { data: null, error: 'Failed to update pincode' }
    }
  }

  // Delete methods
  static async deleteCountry(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting country:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting country:', err)
      return { error: 'Failed to delete country' }
    }
  }

  static async deleteState(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('states')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting state:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting state:', err)
      return { error: 'Failed to delete state' }
    }
  }

  static async deleteCity(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting city:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting city:', err)
      return { error: 'Failed to delete city' }
    }
  }

  static async deletePincode(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('pincodes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting pincode:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (err) {
      console.error('Unexpected error deleting pincode:', err)
      return { error: 'Failed to delete pincode' }
    }
  }

  // Get single entity methods
  static async getCountryById(id: string): Promise<{ data: DatabaseCountry | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching country:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching country:', err)
      return { data: null, error: 'Failed to fetch country' }
    }
  }

  static async getStateById(id: string): Promise<{ data: DatabaseState | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching state:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching state:', err)
      return { data: null, error: 'Failed to fetch state' }
    }
  }

  static async getCityById(id: string): Promise<{ data: DatabaseCity | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching city:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching city:', err)
      return { data: null, error: 'Failed to fetch city' }
    }
  }

  static async getPincodeById(id: string): Promise<{ data: DatabasePincode | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pincodes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching pincode:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error fetching pincode:', err)
      return { data: null, error: 'Failed to fetch pincode' }
    }
  }
}
