'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SOSService, type Patient } from '@/services/sosService'
import { ArrowLeft, Save, AlertTriangle, User, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'

export default function AddSOSCasePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    patient_id: '',
    preferred_primary_hospital_id: '',
    preferred_secondary_hospital_id: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Load patients
        const patientsResult = await SOSService.getPatients()
        if (patientsResult.error) {
          toast.error(`Failed to load patients: ${patientsResult.error}`)
        } else {
          setPatients(patientsResult.data || [])
        }

        // Load hospitals
        const hospitalsResponse = await fetch('/api/hospitals')
        if (hospitalsResponse.ok) {
          const hospitalsData = await hospitalsResponse.json()
          if (hospitalsData.success) {
            setHospitals(hospitalsData.hospitals || [])
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/sos-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: formData.patient_id,
          preferred_primary_hospital_id: formData.preferred_primary_hospital_id || null,
          preferred_secondary_hospital_id: formData.preferred_secondary_hospital_id || null,
          status: 'sos_triggered'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create SOS request')
      }

      if (data.success) {
        toast.success('Emergency case created successfully!', {
          description: 'Emergency response has been initiated.'
        })
        router.push('/sos')
      } else {
        throw new Error(data.error || 'Failed to create SOS request')
      }
    } catch (error) {
      console.error('Error creating SOS request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create emergency case')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Emergency Case</h1>
          <p className="text-gray-600">Report a new emergency and initiate response</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Emergency Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                <Select value={formData.patient_id} onValueChange={(value) => handleInputChange('patient_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.user_id} value={patient.user_id}>
                        {patient.full_name} - {patient.phone || patient.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hospital Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_primary_hospital_id">Preferred Primary Hospital</Label>
                <Select value={formData.preferred_primary_hospital_id} onValueChange={(value) => handleInputChange('preferred_primary_hospital_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_secondary_hospital_id">Preferred Secondary Hospital</Label>
                <Select value={formData.preferred_secondary_hospital_id} onValueChange={(value) => handleInputChange('preferred_secondary_hospital_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


          </CardContent>
        </Card>







        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Emergency Case...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Emergency Case
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
