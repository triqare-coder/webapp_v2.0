'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts'
import { EmergencyContact, CreateEmergencyContactData } from '@/services/emergencyContactService'
import { Plus, Phone, User, Edit, Trash2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

interface EmergencyContactsProps {
  patientId: string
  isEditable?: boolean
}

interface ContactFormData {
  name: string
  phone: string
  relationship: string
}

export function EmergencyContacts({ patientId, isEditable = false }: EmergencyContactsProps) {
  const { contacts, loading, createContact, updateContact, deleteContact, refetch } = useEmergencyContacts(patientId)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    phone: '',
    relationship: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      relationship: ''
    })
    setEditingContact(null)
  }

  const handleAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleEdit = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || ''
    })
    setEditingContact(contact)
    setIsAddDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingContact) {
        // Update existing contact
        await updateContact(editingContact.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim() || undefined
        })
        toast.success('Emergency contact updated successfully')
      } else {
        // Create new contact
        const contactData: CreateEmergencyContactData = {
          patient_id: patientId,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          relationship: formData.relationship.trim() || undefined
        }
        await createContact(contactData)
        toast.success('Emergency contact added successfully')
      }

      setIsAddDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving emergency contact:', error)
      toast.error(editingContact ? 'Failed to update contact' : 'Failed to add contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (contact: EmergencyContact) => {
    if (!confirm(`Are you sure you want to delete ${contact.name}?`)) {
      return
    }

    try {
      await deleteContact(contact.id)
      toast.success('Emergency contact deleted successfully')
    } catch (error) {
      console.error('Error deleting emergency contact:', error)
      toast.error('Failed to delete contact')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading emergency contacts...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Emergency Contacts
            <Badge variant="secondary">{contacts.length}</Badge>
          </div>
          {isEditable && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter contact name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="relationship">Relationship</Label>
                    <Input
                      id="relationship"
                      value={formData.relationship}
                      onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                      placeholder="e.g., Father, Mother, Spouse, Friend"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingContact ? 'Update' : 'Add')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No emergency contacts added yet</p>
            {isEditable && (
              <p className="text-sm mt-2">Click "Add Contact" to add the first emergency contact</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                      {contact.relationship && (
                        <>
                          <span>•</span>
                          <span>{contact.relationship}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {isEditable && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
