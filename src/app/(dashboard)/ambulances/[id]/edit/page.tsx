'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockAmbulances, mockTransportCompanies, mockDrivers } from '@/lib/mock-data'
import { ArrowLeft, Save, Truck, MapPin, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface EditAmbulancePageProps {
  params: {
    id: string
  }
}

export default function EditAmbulancePage({ params }: EditAmbulancePageProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const ambulance = mockAmbulances.find(a => a.id === params.id)
  
  const [equipment, setEquipment] = useState<string[]>(ambulance?.equipment || [])
  const [newEquipment, setNewEquipment] = useState('')
  
  const [formData, setFormData] = useState({
    vehicleNumber: ambulance?.vehicleNumber || '',
    type: ambulance?.type || '',
    status: ambulance?.status || 'available',
    transportCompanyId: ambulance?.transportCompanyId || '',
    driverId: ambulance?.driverId || '',
    latitude: ambulance?.currentLocation.lat.toString() || '',
    longitude: ambulance?.currentLocation.lng.toString() || ''
  })

  if (!ambulance) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ambulance Not Found</h1>
          <p className="text-gray-600 mb-4">The ambulance you're trying to edit doesn't exist.</p>
          <Button onClick={() => router.push('/ambulances')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ambulances
          </Button>
        </div>
      </div>
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addEquipment = () => {
    if (newEquipment.trim() && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()])
      setNewEquipment('')
    }
  }

  const removeEquipment = (item: string) => {
    setEquipment(equipment.filter(e => e !== item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // This form is not yet connected to the ambulance-update backend. Do NOT report
    // a fabricated success or navigate away as if the change was saved — that would
    // make a reviewer believe the ambulance record was updated when nothing was
    // persisted. Surface an honest message and keep the user on the form instead.
    toast.error('Saving is not available yet', {
      description: 'This form is not connected to the backend, so no changes were saved.'
    })

    setIsSubmitting(false)
  }

  const availableDrivers = mockDrivers.filter(d => 
    formData.transportCompanyId ? d.transportCompanyId === formData.transportCompanyId : true
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Ambulance</h1>
          <p className="text-gray-600">Update ambulance information and details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  placeholder="AMB-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Ambulance Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ambulance type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Life Support (BLS)</SelectItem>
                    <SelectItem value="advanced">Advanced Life Support (ALS)</SelectItem>
                    <SelectItem value="critical_care">Critical Care Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on_call">On Call</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportCompanyId">Transport Company *</Label>
                <Select value={formData.transportCompanyId} onValueChange={(value) => handleInputChange('transportCompanyId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport company" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTransportCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverId">Assigned Driver</Label>
              <Select value={formData.driverId} onValueChange={(value) => handleInputChange('driverId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No driver assigned</SelectItem>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName} - {driver.phoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  placeholder="40.7589"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  placeholder="-73.9851"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Current GPS coordinates of the ambulance
            </p>
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {equipment.map((item, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeEquipment(item)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                placeholder="Add equipment (e.g., Defibrillator, IV Equipment)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
              />
              <Button type="button" onClick={addEquipment} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              List all medical equipment available in this ambulance
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Ambulance...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Ambulance
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
