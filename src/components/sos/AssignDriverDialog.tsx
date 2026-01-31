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
import { Badge } from '@/components/ui/badge'
import { Search, User, Phone, Car, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface Driver {
  id: string
  full_name: string
  email: string
  phone?: string
  employee_id?: string
  license_number?: string
  vehicle_number?: string
  vehicle_type?: string
  status?: string
}

interface SOSRequest {
  id: string
  patient_name: string
  patient_phone: string
  status: string
}

interface AssignDriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sosRequest: SOSRequest | null
  onSuccess?: () => void
}

export default function AssignDriverDialog({
  open,
  onOpenChange,
  sosRequest,
  onSuccess
}: AssignDriverDialogProps) {
  const [loading, setLoading] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  // Fetch available drivers
  const fetchDrivers = async (search: string = '') => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        status: 'available', // Only fetch available drivers
        ...(search && { search })
      })

      const response = await fetch(`/api/sos-requests/available-drivers?${params}`)
      const result = await response.json()

      if (response.ok) {
        setDrivers(result.drivers || [])
      } else {
        console.error('Failed to fetch drivers:', result.error)
        toast.error(result.error || 'Failed to load available drivers')
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
      toast.error('Failed to load available drivers')
    }
  }

  useEffect(() => {
    if (open) {
      fetchDrivers()
      setSelectedDriver(null)
      setSearchTerm('')
    }
  }, [open])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        fetchDrivers(searchTerm)
      } else {
        fetchDrivers()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleAssignDriver = async () => {
    if (!selectedDriver || !sosRequest) {
      toast.error('Please select a driver')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sos-requests/assign-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sos_request_id: sosRequest.id,
          driver_id: selectedDriver.id
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Driver assigned successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to assign driver')
      }
    } catch (error) {
      console.error('Error assigning driver:', error)
      toast.error('Failed to assign driver')
    } finally {
      setLoading(false)
    }
  }

  const filteredDrivers = drivers.filter(driver =>
    driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (driver.phone && driver.phone.includes(searchTerm)) ||
    (driver.employee_id && driver.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (driver.license_number && driver.license_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status?: string) => {
    const statusColors: Record<string, string> = {
      'available': 'bg-green-100 text-green-800',
      'assigned': 'bg-yellow-100 text-yellow-800',
      'on_trip': 'bg-blue-100 text-blue-800',
      'inactive': 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={statusColors[status || 'available'] || 'bg-gray-100 text-gray-800'}>
        {status || 'Available'}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Driver to SOS Request</DialogTitle>
          <DialogDescription>
            Select an available driver to assign to this SOS request.
          </DialogDescription>
        </DialogHeader>

        {sosRequest && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
            <h4 className="font-medium text-red-900 mb-2">SOS Request Details</h4>
            <div className="space-y-1 text-sm">
              <div><strong>Patient:</strong> {sosRequest.patient_name}</div>
              <div><strong>Phone:</strong> {sosRequest.patient_phone}</div>
              <div><strong>Status:</strong> {sosRequest.status}</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Driver Search */}
          <div className="space-y-2">
            <Label htmlFor="driver-search">Search Available Drivers</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="driver-search"
                placeholder="Search by name, email, phone, employee ID, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Driver Selection List */}
          <div className="max-h-64 overflow-y-auto border rounded-md">
            {filteredDrivers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No drivers found matching your search' : 'No available drivers'}
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedDriver?.id === driver.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedDriver(driver)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{driver.full_name}</span>
                        {getStatusBadge(driver.status)}
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>{driver.email}</span>
                          {driver.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {driver.phone}
                            </span>
                          )}
                        </div>
                        
                        {driver.employee_id && (
                          <div className="mt-1">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              ID: {driver.employee_id}
                            </span>
                          </div>
                        )}
                        
                        {(driver.vehicle_number || driver.vehicle_type) && (
                          <div className="flex items-center mt-1 space-x-2">
                            <Car className="h-3 w-3" />
                            <span className="text-xs">
                              {driver.vehicle_type} {driver.vehicle_number}
                            </span>
                          </div>
                        )}
                        
                        {driver.license_number && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">
                              License: {driver.license_number}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedDriver?.id === driver.id && (
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

          {/* Selected Driver Details */}
          {selectedDriver && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Driver</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {selectedDriver.full_name}</div>
                <div><strong>Email:</strong> {selectedDriver.email}</div>
                {selectedDriver.phone && (
                  <div><strong>Phone:</strong> {selectedDriver.phone}</div>
                )}
                {selectedDriver.employee_id && (
                  <div><strong>Employee ID:</strong> {selectedDriver.employee_id}</div>
                )}
                {selectedDriver.vehicle_number && (
                  <div><strong>Vehicle:</strong> {selectedDriver.vehicle_type} - {selectedDriver.vehicle_number}</div>
                )}
                {selectedDriver.license_number && (
                  <div><strong>License:</strong> {selectedDriver.license_number}</div>
                )}
              </div>
            </div>
          )}
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
          <Button 
            onClick={handleAssignDriver} 
            disabled={loading || !selectedDriver}
          >
            {loading ? 'Assigning...' : 'Assign Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
