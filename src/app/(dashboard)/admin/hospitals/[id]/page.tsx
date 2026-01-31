'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Building2,
  Save,
  X,
  ArrowLeft,
  MapPin,
  Phone,
  Bed,
  Stethoscope,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useHospital, useHospitals } from '@/hooks/useHospitals'
import { useCountries, useStates, useCities, usePincodes } from '@/hooks/useLocations'
import { toast } from 'sonner'
import LocationPicker from '@/components/maps/LocationPicker'



export default function EditHospitalPage() {
  const params = useParams()
  const router = useRouter()
  const hospitalId = params.id as string

  const { hospital, loading, error, refetch } = useHospital(hospitalId)
  const { updateHospital, deleteHospital } = useHospitals()

  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  // Populate form data when hospital is loaded
  useEffect(() => {
    if (hospital) {
      setFormData({
        name: hospital.name || '',
        hospital_type: hospital.hospital_type || '',
        address_line: hospital.address_line || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
        website: hospital.website || '',
        emergency_contact_person: hospital.emergency_contact_person || '',
        emergency_contact_phone: hospital.emergency_contact_phone || '',
        emergency_contact_email: hospital.emergency_contact_email || '',
        country_id: hospital.country_id || '',
        state_id: hospital.state_id || '',
        city_id: hospital.city_id || '',
        pincode_id: hospital.pincode_id || '',
        latitude: hospital.latitude?.toString() || '',
        longitude: hospital.longitude?.toString() || '',
        general_operating_hours: hospital.general_operating_hours || '',
        emergency_department_hours: hospital.emergency_department_hours || '',
        additional_notes: hospital.additional_notes || '',
        status: hospital.status || 'active'
      })
    }
  }, [hospital])



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
      const updateData = {
        ...formData,
        hospital_type: formData.hospital_type as 'government' | 'private' | 'specialty' | 'other' | undefined,
        status: formData.status as 'active' | 'inactive' | 'under_review' | 'suspended',
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined
      }

      const result = await updateHospital(hospitalId, updateData)

      if (result.success) {
        toast.success('Hospital updated successfully!')
        setIsEditing(false)
        refetch() // Refresh the hospital data
      } else {
        toast.error(result.error || 'Failed to update hospital')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error updating hospital:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)

    try {
      const result = await deleteHospital(hospitalId)

      if (result.success) {
        toast.success('Hospital deleted successfully!')
        router.push('/admin/hospitals')
      } else {
        toast.error(result.error || 'Failed to delete hospital')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error deleting hospital:', error)
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
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
                🏥 Hospital Details
              </h1>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading hospital details...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
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
                🏥 Hospital Details
              </h1>
              <p className="text-gray-600">Error loading hospital</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">Failed to load hospital details</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Show not found state
  if (!hospital) {
    return (
      <div className="p-6 space-y-6">
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
                🏥 Hospital Details
              </h1>
              <p className="text-gray-600">Hospital not found</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Hospital with ID "{hospitalId}" was not found</div>
          <Link href="/admin/hospitals">
            <Button>Back to Hospitals</Button>
          </Link>
        </div>
      </div>
    )
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
                🏥 Hospital Details
              </h1>
              <p className="text-gray-600">
                Hospital ID: {hospitalId} • Created: {new Date(hospital.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={hospital.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {hospital.status === 'active' ? '✓ Active' : '⚠ Inactive'}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800">
              <Building2 className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Hospital
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(false)} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Hospital
          </Button>
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
                <Label htmlFor="name">Hospital Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Hospital Type</Label>
                  <Select
                    value={formData.hospital_type}
                    onValueChange={(value) => handleInputChange('hospital_type', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government">Government Hospital</SelectItem>
                      <SelectItem value="private">Private Hospital</SelectItem>
                      <SelectItem value="teaching">Teaching Hospital</SelectItem>
                      <SelectItem value="specialty">Specialty Hospital</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
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
                    disabled={!isEditing}
                  />
                </div>
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
                <Label htmlFor="address_line">Address Line</Label>
                <Input
                  id="address_line"
                  value={formData.address_line}
                  onChange={(e) => handleInputChange('address_line', e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country_id">Country *</Label>
                  <Select
                    value={formData.country_id}
                    onValueChange={(value) => handleInputChange('country_id', value)}
                    disabled={!isEditing}
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
                    disabled={!isEditing || !formData.country_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.country_id
                          ? "Select country first"
                          : statesLoading
                            ? "Loading states..."
                            : "Select state"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city_id">City *</Label>
                  <Select
                    value={formData.city_id}
                    onValueChange={(value) => handleInputChange('city_id', value)}
                    disabled={!isEditing || !formData.state_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.state_id
                          ? "Select state first"
                          : citiesLoading
                            ? "Loading cities..."
                            : "Select city"
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
                    disabled={!isEditing || !formData.city_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.city_id
                          ? "Select city first"
                          : pincodesLoading
                            ? "Loading pincodes..."
                            : "Select pincode"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {pincodes.map((pincode) => (
                        <SelectItem key={pincode.id} value={pincode.id}>
                          {pincode.code}
                        </SelectItem>
                      ))}
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
                disabled={!isEditing}
                label="Coordinates * (click map icon to select)"
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
                  <Label htmlFor="phone">Main Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Main Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_person">Emergency Contact Person *</Label>
                  <Input
                    id="emergency_contact_person"
                    value={formData.emergency_contact_person}
                    onChange={(e) => handleInputChange('emergency_contact_person', e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                  <Input
                    id="general_operating_hours"
                    value={formData.general_operating_hours}
                    onChange={(e) => handleInputChange('general_operating_hours', e.target.value)}
                    disabled={!isEditing}
                    placeholder="e.g., Mon-Sat 8:00–20:00"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_department_hours">Emergency Department Hours</Label>
                  <Input
                    id="emergency_department_hours"
                    value={formData.emergency_department_hours}
                    onChange={(e) => handleInputChange('emergency_department_hours', e.target.value)}
                    disabled={!isEditing}
                    placeholder="e.g., 24/7"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="additional_notes">Additional Notes</Label>
                <Textarea
                  id="additional_notes"
                  value={formData.additional_notes}
                  onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Any additional remarks or special information about the hospital..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="status">Hospital Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
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

          {/* Save Button - Only show when editing */}
          {isEditing && (
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Deletion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Are you sure you want to delete this hospital? This action cannot be undone.</p>
                <div className="flex items-center justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Hospital
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  )
}
