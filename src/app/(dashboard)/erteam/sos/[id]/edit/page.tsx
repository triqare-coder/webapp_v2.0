'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, AlertTriangle, User, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SOSRequest } from '@/services/sosService'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Type definitions for form data
interface PatientOption {
  id: string
  full_name: string
  email: string
  phone?: string
}

interface DriverOption {
  id: string
  full_name: string
  email: string
  phone?: string
  vehicle_assigned?: string
  license_number?: string
  rating?: number
}

interface HospitalOption {
  id: string
  name: string
  address_line?: string
  phone?: string
}

interface EditSOSPageProps {
  params: Promise<{ id: string }>
}

export default function EditSOSPage({ params }: EditSOSPageProps) {
  const router = useRouter()
  const { user: currentUser } = useCurrentUser()
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [hospitals, setHospitals] = useState<HospitalOption[]>([])
  const [formData, setFormData] = useState({
    patient_id: '',
    driver_id: '',
    assigned_by: '',
    status: 'SOS Triggered' as 'SOS Triggered' | 'Driver Assigned' | 'Driver En Route' | 'Patient Picked Up' | 'At Hospital' | 'Completed' | 'Cancelled',
    preferred_primary_hospital_id: '',
    preferred_secondary_hospital_id: '',
    auto_assigned: true
  })

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // Fetch SOS request data and form options
  useEffect(() => {
    if (!resolvedParams?.id) return

    const fetchData = async () => {
      try {
        // Fetch SOS request
        const sosResponse = await fetch(`/api/sos-requests/${resolvedParams.id}`)
        if (sosResponse.ok) {
          const sosData = await sosResponse.json()
          const sosRequest = sosData.sos_request
          setFormData({
            patient_id: sosRequest.patient_id || '',
            driver_id: sosRequest.driver_id || '',
            assigned_by: sosRequest.assigned_by || '',
            status: sosRequest.status || 'pending',
            preferred_primary_hospital_id: sosRequest.preferred_primary_hospital_id || '',
            preferred_secondary_hospital_id: sosRequest.preferred_secondary_hospital_id || '',
            auto_assigned: sosRequest.auto_assigned !== false
          })
        } else {
          toast.error('Failed to load SOS request')
          router.push('/erteam/sos')
          return
        }

        // Fetch patients (users with role 'patient')
        const patientsResponse = await fetch('/api/users?role=patient')
        if (patientsResponse.ok) {
          const patientsData = await patientsResponse.json()
          setPatients(patientsData.users || [])
        }

        // Fetch drivers (users with role 'driver')
        const driversResponse = await fetch('/api/users?role=driver')
        if (driversResponse.ok) {
          const driversData = await driversResponse.json()
          setDrivers(driversData.users || [])
        }

        // Fetch hospitals
        const hospitalsResponse = await fetch('/api/hospitals')
        if (hospitalsResponse.ok) {
          const hospitalsData = await hospitalsResponse.json()
          setHospitals(hospitalsData.hospitals || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load form data')
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resolvedParams?.id) return

    // Validate required fields
    if (!formData.patient_id) {
      toast.error('Please select a patient')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch(`/api/sos-requests/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          assigned_by: formData.driver_id && formData.status === 'Driver Assigned' ? currentUser?.id || null : formData.assigned_by,
          assigned_at: formData.driver_id && formData.status === 'Driver Assigned' ? new Date().toISOString() : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update SOS request')
      }

      const result = await response.json()
      toast.success('SOS request updated successfully!')
      router.push('/erteam/sos')
    } catch (error) {
      console.error('Error updating SOS request:', error)
      toast.error('Failed to update SOS request')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (initialLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/erteam/sos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to SOS Cases
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-red-600" />
              Edit SOS Request
            </h1>
            <p className="text-gray-600">Update emergency response request details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Patient Information
            </CardTitle>
            <CardDescription>Select the patient for this emergency request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient *</Label>
              <Select value={formData.patient_id} onValueChange={(value) => handleInputChange('patient_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name || 'Unknown'} - {patient.email || 'No email'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Assignment & Status
            </CardTitle>
            <CardDescription>Update driver assignment and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driver_id">Assign Driver</Label>
                <Select value={formData.driver_id || "none"} onValueChange={(value) => handleInputChange('driver_id', value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No driver assigned</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name || 'Unknown'} - {driver.email || 'No email'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hospital Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Hospital Preferences
            </CardTitle>
            <CardDescription>Update preferred hospitals for this emergency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_primary_hospital_id">Primary Hospital</Label>
                <Select
                  value={formData.preferred_primary_hospital_id || "none"}
                  onValueChange={(value) => handleInputChange('preferred_primary_hospital_id', value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name} - {hospital.address_line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_secondary_hospital_id">Secondary Hospital</Label>
                <Select
                  value={formData.preferred_secondary_hospital_id || "none"}
                  onValueChange={(value) => handleInputChange('preferred_secondary_hospital_id', value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name} - {hospital.address_line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_assigned"
                checked={formData.auto_assigned}
                onCheckedChange={(checked) => handleInputChange('auto_assigned', checked as boolean)}
              />
              <Label htmlFor="auto_assigned">Enable automatic assignment</Label>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Link href="/erteam/sos">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update SOS Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
