'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2,
  Save,
  X,
  ArrowLeft,
  MapPin,
  Phone,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHospitals } from '@/hooks/useHospitals'
import { useCountries, useStates, useCities, usePincodes } from '@/hooks/useLocations'
import { toast } from 'sonner'
import LocationPicker from '@/components/maps/LocationPicker'

export default function AddHospitalPage() {
  const router = useRouter()
  const { createHospital } = useHospitals()

  const [formData, setFormData] = useState({
    name: '',
    hospital_type: '',
    address_line: '',
    phone: '',
    email: '',
    website: '',
    emergency_contact_person: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    country_id: '',
    state_id: '',
    city_id: '',
    pincode_id: '',
    latitude: '',
    longitude: '',
    general_operating_hours: '',
    emergency_department_hours: '',
    additional_notes: '',
    status: 'active'
  })

  // Location data hooks
  const { countries, loading: countriesLoading } = useCountries()
  const { states, loading: statesLoading } = useStates(formData.country_id)
  const { cities, loading: citiesLoading } = useCities(formData.state_id)
  const { pincodes, loading: pincodesLoading } = usePincodes(formData.city_id)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // Clear dependent fields when parent selection changes
      if (field === 'country_id') {
        newData.state_id = ''
        newData.city_id = ''
        newData.pincode_id = ''
      } else if (field === 'state_id') {
        newData.city_id = ''
        newData.pincode_id = ''
      } else if (field === 'city_id') {
        newData.pincode_id = ''
      }

      return newData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const hospitalData = {
        ...formData,
        hospital_type: formData.hospital_type as 'government' | 'private' | 'specialty' | 'other',
        status: formData.status as 'active' | 'inactive' | 'under_review' | 'suspended',
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
      }
      const result = await createHospital(hospitalData)

      if (result.success) {
        toast.success('Hospital created successfully!')
        router.push('/admin/hospitals')
      } else {
        toast.error(result.error || 'Failed to create hospital')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error creating hospital:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/hospitals">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Hospitals
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🏥 Add New Hospital
              </h1>
              <p className="text-gray-600">
                Register a new hospital in the emergency response network
              </p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800">
            <Building2 className="h-3 w-3 mr-1" />
            Admin Access
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Hospital Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter hospital name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hospital_type">Hospital Type *</Label>
                  <Select onValueChange={(value) => handleInputChange('hospital_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hospital type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government">Government Hospital</SelectItem>
                      <SelectItem value="private">Private Hospital</SelectItem>
                      <SelectItem value="specialty">Specialty Hospital</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://hospital-website.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address_line">Address Line *</Label>
                <Input
                  id="address_line"
                  value={formData.address_line}
                  onChange={(e) => handleInputChange('address_line', e.target.value)}
                  placeholder="Enter complete address"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="country_id">Country *</Label>
                  <Select
                    value={formData.country_id}
                    onValueChange={(value) => handleInputChange('country_id', value)}
                    disabled={countriesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={countriesLoading ? "Loading countries..." : "Select country"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="state_id">State *</Label>
                  <Select
                    value={formData.state_id}
                    onValueChange={(value) => handleInputChange('state_id', value)}
                    disabled={statesLoading || !formData.country_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.country_id ? "Select country first" :
                        statesLoading ? "Loading states..." :
                        "Select state"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="city_id">City *</Label>
                  <Select
                    value={formData.city_id}
                    onValueChange={(value) => handleInputChange('city_id', value)}
                    disabled={citiesLoading || !formData.state_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.state_id ? "Select state first" :
                        citiesLoading ? "Loading cities..." :
                        "Select city"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pincode_id">Pincode *</Label>
                  <Select
                    value={formData.pincode_id}
                    onValueChange={(value) => handleInputChange('pincode_id', value)}
                    disabled={pincodesLoading || !formData.city_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.city_id ? "Select city first" :
                        pincodesLoading ? "Loading pincodes..." :
                        "Select pincode"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {pincodes.map((pincode) => (
                        <SelectItem key={pincode.id} value={pincode.id}>
                          {pincode.code}
                        </SelectItem>
                      ))}
                      <SelectItem value="10016">10016</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <LocationPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={(lat, lng) => {
                  handleInputChange('latitude', lat)
                  handleInputChange('longitude', lng)
                }}
                label="Coordinates (click map icon to select)"
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Main Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1-555-0123"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Main Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="info@hospital.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_person">Emergency Contact Person *</Label>
                  <Input
                    id="emergency_contact_person"
                    value={formData.emergency_contact_person}
                    onChange={(e) => handleInputChange('emergency_contact_person', e.target.value)}
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="+1-555-0124"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_email">Emergency Contact Email</Label>
                  <Input
                    id="emergency_contact_email"
                    type="email"
                    value={formData.emergency_contact_email}
                    onChange={(e) => handleInputChange('emergency_contact_email', e.target.value)}
                    placeholder="emergency@hospital.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="general_operating_hours">General Operating Hours</Label>
                  <Textarea
                    id="general_operating_hours"
                    value={formData.general_operating_hours}
                    onChange={(e) => handleInputChange('general_operating_hours', e.target.value)}
                    placeholder="e.g., Mon-Fri 8:00-18:00, Sat-Sun 9:00-16:00"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_department_hours">Emergency Department Hours</Label>
                  <Textarea
                    id="emergency_department_hours"
                    value={formData.emergency_department_hours}
                    onChange={(e) => handleInputChange('emergency_department_hours', e.target.value)}
                    placeholder="e.g., 24/7 or specific hours"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="additional_notes"
                value={formData.additional_notes}
                onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                placeholder="Any additional information about the hospital"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link href="/admin/hospitals">
              <Button variant="outline" type="button">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Hospital
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
  )
}
