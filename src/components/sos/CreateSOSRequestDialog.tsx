'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Search, User, Phone, MapPin, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { getUserDisplayName } from '@/utils/userUtils'

interface Patient {
  user_id: string
  blood_group?: string
  allergies?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  address_line?: string
  users: {
    id: string
    full_name: string
    email: string
    phone?: string
  }
}

interface CreateSOSRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateSOSRequestDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateSOSRequestDialogProps) {
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [autoAssigned, setAutoAssigned] = useState(true)
  const [status, setStatus] = useState('SOS Triggered')

  // Fetch patients for selection
  const fetchPatients = async (search: string = '') => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(search && { search })
      })

      const response = await fetch(`/api/patients?${params}`)
      const result = await response.json()

      if (response.ok) {
        setPatients(result.data || [])
      } else {
        console.error('Failed to fetch patients:', result.error)
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  useEffect(() => {
    if (open) {
      fetchPatients()
    }
  }, [open])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        fetchPatients(searchTerm)
      } else {
        fetchPatients()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPatient) {
      toast.error('Please select a patient')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sos-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatient.user_id,
          auto_assigned: autoAssigned,
          status
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('SOS request created successfully')
        onOpenChange(false)
        onSuccess?.()
        // Reset form
        setSelectedPatient(null)
        setSearchTerm('')
        setAutoAssigned(true)
        setStatus('SOS Triggered')
      } else {
        toast.error(result.error || 'Failed to create SOS request')
      }
    } catch (error) {
      console.error('Error creating SOS request:', error)
      toast.error('Failed to create SOS request')
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.users.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.users.phone && patient.users.phone.includes(searchTerm))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create SOS Request</DialogTitle>
          <DialogDescription>
            Create a new SOS request for a patient. Select the patient and configure the request settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient-search">Select Patient *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="patient-search"
                placeholder="Search patients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Patient Selection List */}
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {filteredPatients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No patients found matching your search' : 'No patients available'}
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.user_id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedPatient?.user_id === patient.user_id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {patient.users?.full_name || patient.users?.email?.split('@')[0] || 'Unknown'}
                          </span>
                          {patient.blood_group && (
                            <Badge variant="outline" className="text-xs">
                              <Heart className="h-3 w-3 mr-1" />
                              {patient.blood_group}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>{patient.users.email}</span>
                            {patient.users.phone && (
                              <span className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {patient.users.phone}
                              </span>
                            )}
                          </div>
                          {patient.address_line && (
                            <div className="flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="text-xs">{patient.address_line}</span>
                            </div>
                          )}
                        </div>
                        {patient.allergies && (
                          <div className="mt-1">
                            <Badge variant="destructive" className="text-xs">
                              Allergies: {patient.allergies}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {selectedPatient?.user_id === patient.user_id && (
                        <div className="ml-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Patient Details */}
          {selectedPatient && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Patient</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {selectedPatient.users.full_name}</div>
                <div><strong>Email:</strong> {selectedPatient.users.email}</div>
                {selectedPatient.users.phone && (
                  <div><strong>Phone:</strong> {selectedPatient.users.phone}</div>
                )}
                {selectedPatient.blood_group && (
                  <div><strong>Blood Group:</strong> {selectedPatient.blood_group}</div>
                )}
                {selectedPatient.emergency_contact_name && (
                  <div>
                    <strong>Emergency Contact:</strong> {selectedPatient.emergency_contact_name}
                    {selectedPatient.emergency_contact_phone && ` (${selectedPatient.emergency_contact_phone})`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Request Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOS Triggered">SOS Triggered</SelectItem>
                  <SelectItem value="Driver Assigned">Driver Assigned</SelectItem>
                  <SelectItem value="Driver En Route">Driver En Route</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Auto Assignment</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="auto-assigned"
                  checked={autoAssigned}
                  onCheckedChange={(checked) => setAutoAssigned(checked as boolean)}
                />
                <Label htmlFor="auto-assigned" className="text-sm">
                  Enable automatic driver assignment
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPatient}>
              {loading ? 'Creating...' : 'Create SOS Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
