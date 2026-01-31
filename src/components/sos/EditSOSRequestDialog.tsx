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
import { User, Phone, Heart, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SOSRequest {
  id: string
  patient_id: string
  patient_name: string
  patient_email: string
  patient_phone: string
  patient_details: {
    blood_group?: string
    allergies?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    address_line?: string
  }
  assigned_driver?: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  requested_at: string
  assigned_at?: string | null
  completed_at?: string | null
  auto_assigned: boolean
  status: string
}

interface EditSOSRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sosRequest: SOSRequest | null
  onSuccess?: () => void
}

export default function EditSOSRequestDialog({
  open,
  onOpenChange,
  sosRequest,
  onSuccess
}: EditSOSRequestDialogProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [autoAssigned, setAutoAssigned] = useState(true)

  useEffect(() => {
    if (sosRequest && open) {
      setStatus(sosRequest.status)
      setAutoAssigned(sosRequest.auto_assigned)
    }
  }, [sosRequest, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sosRequest) return

    setLoading(true)

    try {
      const updateData: any = {
        status,
        auto_assigned: autoAssigned
      }

      // Auto-set completed_at when status is Completed
      if (status === 'Completed' && sosRequest.status !== 'Completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const response = await fetch(`/api/sos-requests/${sosRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('SOS request updated successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update SOS request')
      }
    } catch (error) {
      console.error('Error updating SOS request:', error)
      toast.error('Failed to update SOS request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'SOS Triggered': 'bg-red-100 text-red-800',
      'Driver En Route': 'bg-blue-100 text-blue-800',
      'Transport Arrived': 'bg-yellow-100 text-yellow-800',
      'User Picked Up': 'bg-purple-100 text-purple-800',
      'Arrived at Hospital': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
  }

  if (!sosRequest) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit SOS Request</DialogTitle>
          <DialogDescription>
            Update the status and settings for this SOS request.
          </DialogDescription>
        </DialogHeader>

        {/* SOS Request Details */}
        <div className="space-y-4">
          {/* Request Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Request Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Request ID:</span>
                <div className="font-mono">{sosRequest.id.slice(0, 8)}...</div>
              </div>
              <div>
                <span className="text-gray-600">Requested At:</span>
                <div>{formatDateTime(sosRequest.requested_at)}</div>
              </div>
              {sosRequest.assigned_at && (
                <div>
                  <span className="text-gray-600">Assigned At:</span>
                  <div>{formatDateTime(sosRequest.assigned_at)}</div>
                </div>
              )}
              {sosRequest.completed_at && (
                <div>
                  <span className="text-gray-600">Completed At:</span>
                  <div>{formatDateTime(sosRequest.completed_at)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Patient Details */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">Patient Information</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{sosRequest.patient_name}</span>
                {sosRequest.patient_details.blood_group && (
                  <Badge variant="outline" className="text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    {sosRequest.patient_details.blood_group}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm space-y-1">
                <div>{sosRequest.patient_email}</div>
                {sosRequest.patient_phone && (
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {sosRequest.patient_phone}
                  </div>
                )}
                {sosRequest.patient_details.address_line && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {sosRequest.patient_details.address_line}
                  </div>
                )}
              </div>

              {sosRequest.patient_details.allergies && (
                <div>
                  <Badge variant="destructive" className="text-xs">
                    Allergies: {sosRequest.patient_details.allergies}
                  </Badge>
                </div>
              )}

              {sosRequest.patient_details.emergency_contact_name && (
                <div className="text-sm">
                  <span className="text-gray-600">Emergency Contact:</span>
                  <div>{sosRequest.patient_details.emergency_contact_name}</div>
                  {sosRequest.patient_details.emergency_contact_phone && (
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {sosRequest.patient_details.emergency_contact_phone}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Assigned Driver */}
          {sosRequest.assigned_driver && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Assigned Driver</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {sosRequest.assigned_driver.name}</div>
                <div><strong>Email:</strong> {sosRequest.assigned_driver.email}</div>
                <div><strong>Phone:</strong> {sosRequest.assigned_driver.phone}</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Current Status:</span>
            {getStatusBadge(sosRequest.status)}
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Update Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOS Triggered">SOS Triggered</SelectItem>
                  <SelectItem value="Driver En Route">Driver En Route</SelectItem>
                  <SelectItem value="Transport Arrived">Transport Arrived</SelectItem>
                  <SelectItem value="User Picked Up">User Picked Up</SelectItem>
                  <SelectItem value="Arrived at Hospital">Arrived at Hospital</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update SOS Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
