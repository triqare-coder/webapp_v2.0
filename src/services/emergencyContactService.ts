import { supabase } from '@/lib/supabase'

export interface EmergencyContact {
  id: string
  patient_id: string
  name: string
  phone: string
  relationship?: string
  created_at: string
  updated_at: string
}

export interface CreateEmergencyContactData {
  patient_id: string
  name: string
  phone: string
  relationship?: string
}

export interface UpdateEmergencyContactData {
  name?: string
  phone?: string
  relationship?: string
}

export class EmergencyContactService {
  // Get all emergency contacts for a patient
  static async getEmergencyContactsByPatient(patientId: string): Promise<EmergencyContact[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching emergency contacts:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getEmergencyContactsByPatient:', error)
      throw error
    }
  }

  // Get a single emergency contact by ID
  static async getEmergencyContact(id: string): Promise<EmergencyContact | null> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching emergency contact:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getEmergencyContact:', error)
      throw error
    }
  }

  // Create a new emergency contact
  static async createEmergencyContact(contactData: CreateEmergencyContactData): Promise<EmergencyContact | null> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert([contactData])
        .select()
        .single()

      if (error) {
        console.error('Error creating emergency contact:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createEmergencyContact:', error)
      throw error
    }
  }

  // Update an emergency contact
  static async updateEmergencyContact(id: string, updateData: UpdateEmergencyContactData): Promise<EmergencyContact | null> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating emergency contact:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateEmergencyContact:', error)
      throw error
    }
  }

  // Delete an emergency contact
  static async deleteEmergencyContact(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting emergency contact:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in deleteEmergencyContact:', error)
      throw error
    }
  }

  // Create multiple emergency contacts for a patient
  static async createMultipleEmergencyContacts(contacts: CreateEmergencyContactData[]): Promise<EmergencyContact[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert(contacts)
        .select()

      if (error) {
        console.error('Error creating multiple emergency contacts:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in createMultipleEmergencyContacts:', error)
      throw error
    }
  }

  // Delete all emergency contacts for a patient
  static async deleteEmergencyContactsByPatient(patientId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('patient_id', patientId)

      if (error) {
        console.error('Error deleting emergency contacts for patient:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in deleteEmergencyContactsByPatient:', error)
      throw error
    }
  }
}

// Export service instance
export const emergencyContactService = EmergencyContactService
