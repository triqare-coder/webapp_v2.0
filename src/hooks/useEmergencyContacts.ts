import { useState, useEffect, useCallback } from 'react'
import { 
  EmergencyContact, 
  CreateEmergencyContactData, 
  UpdateEmergencyContactData,
  emergencyContactService 
} from '@/services/emergencyContactService'

export function useEmergencyContacts(patientId?: string) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!patientId) {
      setContacts([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await emergencyContactService.getEmergencyContactsByPatient(patientId)
      setContacts(data)
    } catch (err) {
      console.error('Error fetching emergency contacts:', err)
      setError('Failed to fetch emergency contacts')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const createContact = useCallback(async (contactData: CreateEmergencyContactData) => {
    try {
      setError(null)
      const newContact = await emergencyContactService.createEmergencyContact(contactData)
      if (newContact) {
        setContacts(prev => [...prev, newContact])
        return newContact
      }
      return null
    } catch (err) {
      console.error('Error creating emergency contact:', err)
      setError('Failed to create emergency contact')
      throw err
    }
  }, [])

  const updateContact = useCallback(async (id: string, updateData: UpdateEmergencyContactData) => {
    try {
      setError(null)
      const updatedContact = await emergencyContactService.updateEmergencyContact(id, updateData)
      if (updatedContact) {
        setContacts(prev => prev.map(contact => 
          contact.id === id ? updatedContact : contact
        ))
        return updatedContact
      }
      return null
    } catch (err) {
      console.error('Error updating emergency contact:', err)
      setError('Failed to update emergency contact')
      throw err
    }
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    try {
      setError(null)
      const success = await emergencyContactService.deleteEmergencyContact(id)
      if (success) {
        setContacts(prev => prev.filter(contact => contact.id !== id))
        return true
      }
      return false
    } catch (err) {
      console.error('Error deleting emergency contact:', err)
      setError('Failed to delete emergency contact')
      throw err
    }
  }, [])

  const createMultipleContacts = useCallback(async (contactsData: CreateEmergencyContactData[]) => {
    try {
      setError(null)
      const newContacts = await emergencyContactService.createMultipleEmergencyContacts(contactsData)
      setContacts(prev => [...prev, ...newContacts])
      return newContacts
    } catch (err) {
      console.error('Error creating multiple emergency contacts:', err)
      setError('Failed to create emergency contacts')
      throw err
    }
  }, [])

  const refetch = useCallback(() => {
    fetchContacts()
  }, [fetchContacts])

  return {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    createMultipleContacts,
    refetch
  }
}

export function useEmergencyContact(id?: string) {
  const [contact, setContact] = useState<EmergencyContact | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContact = useCallback(async () => {
    if (!id) {
      setContact(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await emergencyContactService.getEmergencyContact(id)
      setContact(data)
    } catch (err) {
      console.error('Error fetching emergency contact:', err)
      setError('Failed to fetch emergency contact')
      setContact(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchContact()
  }, [fetchContact])

  return {
    contact,
    loading,
    error,
    refetch: fetchContact
  }
}
