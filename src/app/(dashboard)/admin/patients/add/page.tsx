'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { 
  UserPlus, 
  Save, 
  X,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  Calendar,
  Users,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCreatePatient } from '@/hooks/usePatients'
import { useHospitals } from '@/hooks/useHospitals'
import { useCountries, useStates, useCities, usePincodes } from '@/hooks/useLocations'
import { useUsersByRole } from '@/hooks/useUsers'
import LocationPicker from '@/components/maps/LocationPicker'

export default function AddPatientPage() {
  const router = useRouter()
  const { createPatient, loading: createLoading } = useCreatePatient()
  const { hospitals } = useHospitals()
  const { countries } = useCountries()
  const { users: availableUsers } = useUsersByRole('patient')

  const [formData, setFormData] = useState({
    user_id: '',
    dob: '',
    gender: '' as 'Male' | 'Female' | 'Other' | '',
    blood_group: '' as 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | '',
    allergies: '',
    abha_id: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_valid_till: '',
    primary_hospital_id: '',
    secondary_hospital_id: '',
    latitude: '',
    longitude: '',
    country_id: '',
    state_id: '',
    city_id: '',
    pincode_id: '',
    address_line: ''
  })

  // Location hooks with dependencies
  const { states } = useStates(formData.country_id || undefined)
  const { cities } = useCities(formData.state_id || undefined)
  const { pincodes } = usePincodes(formData.city_id || undefined)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Reset dependent location fields when parent changes
  const handleCountryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      country_id: value,
      state_id: '',
      city_id: '',
      pincode_id: ''
    }))
  }

  const handleStateChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      state_id: value,
      city_id: '',
      pincode_id: ''
    }))
  }

  const handleCityChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      city_id: value,
      pincode_id: ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.user_id) {
      toast.error('Please select a user for this patient record')
      return
    }

    try {
      // Convert form data to proper types
      const patientData = {
        ...formData,
        gender: formData.gender || undefined,
        blood_group: formData.blood_group || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        dob: formData.dob || undefined,
        insurance_valid_till: formData.insurance_valid_till || undefined,
        primary_hospital_id: formData.primary_hospital_id === 'none' ? undefined : formData.primary_hospital_id || undefined,
        secondary_hospital_id: formData.secondary_hospital_id === 'none' ? undefined : formData.secondary_hospital_id || undefined,
      }

      const result = await createPatient(patientData)

      if (result) {
        toast.success('Patient created successfully')
        router.push('/admin/patients')
      } else {
        toast.error('Failed to create patient')
      }
    } catch (error) {
      console.error('Error creating patient:', error)
      toast.error('Failed to create patient')
    }
  }

  const selectedUser = availableUsers?.find(user => user.id === formData.user_id)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👤 Add New Patient</h1>
            <p className="text-gray-600">Create a new patient record</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user_id">Select User *</Label>
              <Combobox
                options={availableUsers?.map((user): ComboboxOption => ({
                  value: user.id,
                  label: `${user.full_name} (${user.email})`
                })) || []}
                value={formData.user_id}
                onValueChange={(value) => handleInputChange('user_id', value)}
                placeholder="Select a user to create patient record for"
                searchPlaceholder="Search users..."
                emptyText="No users found."
              />
              {selectedUser && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Selected User:</strong> {selectedUser.full_name} - {selectedUser.email}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Combobox
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other" }
                  ]}
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value)}
                  placeholder="Select gender"
                  searchPlaceholder="Search gender..."
                />
              </div>
              <div>
                <Label htmlFor="blood_group">Blood Group</Label>
                <Combobox
                  options={[
                    { value: "A+", label: "A+" },
                    { value: "A-", label: "A-" },
                    { value: "B+", label: "B+" },
                    { value: "B-", label: "B-" },
                    { value: "AB+", label: "AB+" },
                    { value: "AB-", label: "AB-" },
                    { value: "O+", label: "O+" },
                    { value: "O-", label: "O-" }
                  ]}
                  value={formData.blood_group}
                  onValueChange={(value) => handleInputChange('blood_group', value)}
                  placeholder="Select blood group"
                  searchPlaceholder="Search blood group..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="abha_id">ABHA ID</Label>
              <Input
                id="abha_id"
                value={formData.abha_id}
                onChange={(e) => handleInputChange('abha_id', e.target.value)}
                placeholder="12-3456-7890-1234"
              />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country_id">Country</Label>
                <Combobox
                  options={countries?.map((country): ComboboxOption => ({
                    value: country.id,
                    label: country.name
                  })) || []}
                  value={formData.country_id}
                  onValueChange={handleCountryChange}
                  placeholder="Select country"
                  searchPlaceholder="Search countries..."
                  emptyText="No countries found."
                />
              </div>
              <div>
                <Label htmlFor="state_id">State</Label>
                <Combobox
                  options={states?.map((state): ComboboxOption => ({
                    value: state.id,
                    label: state.name
                  })) || []}
                  value={formData.state_id}
                  onValueChange={handleStateChange}
                  disabled={!formData.country_id}
                  placeholder="Select state"
                  searchPlaceholder="Search states..."
                  emptyText="No states found."
                />
              </div>
              <div>
                <Label htmlFor="city_id">City</Label>
                <Combobox
                  options={cities?.map((city): ComboboxOption => ({
                    value: city.id,
                    label: city.name
                  })) || []}
                  value={formData.city_id}
                  onValueChange={handleCityChange}
                  disabled={!formData.state_id}
                  placeholder="Select city"
                  searchPlaceholder="Search cities..."
                  emptyText="No cities found."
                />
              </div>
              <div>
                <Label htmlFor="pincode_id">Pincode</Label>
                <Combobox
                  options={pincodes?.map((pincode): ComboboxOption => ({
                    value: pincode.id,
                    label: pincode.code
                  })) || []}
                  value={formData.pincode_id}
                  onValueChange={(value) => handleInputChange('pincode_id', value)}
                  disabled={!formData.city_id}
                  placeholder="Select pincode"
                  searchPlaceholder="Search pincodes..."
                  emptyText="No pincodes found."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address_line">Address Line</Label>
              <Textarea
                id="address_line"
                value={formData.address_line}
                onChange={(e) => handleInputChange('address_line', e.target.value)}
                placeholder="Street address, building name, etc."
              />
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

        {/* Emergency Contact Note */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Emergency contacts can be added after creating the patient</p>
              <p className="text-sm mt-2">You'll be able to add multiple emergency contacts on the patient edit page</p>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                placeholder="List any known allergies (medications, food, environmental, etc.)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Insurance Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Insurance Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                  placeholder="e.g., Blue Cross Blue Shield"
                />
              </div>
              <div>
                <Label htmlFor="insurance_policy_number">Policy Number</Label>
                <Input
                  id="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={(e) => handleInputChange('insurance_policy_number', e.target.value)}
                  placeholder="e.g., BC123456789"
                />
              </div>
              <div>
                <Label htmlFor="insurance_valid_till">Valid Till</Label>
                <Input
                  id="insurance_valid_till"
                  type="date"
                  value={formData.insurance_valid_till}
                  onChange={(e) => handleInputChange('insurance_valid_till', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hospital Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Hospital Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_hospital_id">Primary Hospital</Label>
                <Combobox
                  options={[
                    { value: "none", label: "No Primary Hospital" },
                    ...(hospitals?.map((hospital): ComboboxOption => ({
                      value: hospital.id,
                      label: hospital.name
                    })) || [])
                  ]}
                  value={formData.primary_hospital_id}
                  onValueChange={(value) => handleInputChange('primary_hospital_id', value)}
                  placeholder="Select Primary Hospital"
                  searchPlaceholder="Search hospitals..."
                  emptyText="No hospitals found."
                />
              </div>
              <div>
                <Label htmlFor="secondary_hospital_id">Secondary Hospital</Label>
                <Combobox
                  options={[
                    { value: "none", label: "No Secondary Hospital" },
                    ...(hospitals?.map((hospital): ComboboxOption => ({
                      value: hospital.id,
                      label: hospital.name
                    })) || [])
                  ]}
                  value={formData.secondary_hospital_id}
                  onValueChange={(value) => handleInputChange('secondary_hospital_id', value)}
                  placeholder="Select Secondary Hospital"
                  searchPlaceholder="Search hospitals..."
                  emptyText="No hospitals found."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Link href="/admin/patients">
            <Button variant="outline" type="button">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createLoading}>
            {createLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Patient
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
