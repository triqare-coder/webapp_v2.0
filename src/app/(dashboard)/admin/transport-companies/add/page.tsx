'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'
import {
  Building2,
  ArrowLeft,
  Save,
  User,
  MapPin,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useCreateTransportCompany } from '@/hooks/useTransportCompanies'
import { useCountries, useStates, useCities, usePincodes } from '@/hooks/useLocations'
import { useUsersByRole } from '@/hooks/useUsers'

interface FormData {
  user_id: string
  company_name: string
  address_line: string
  registration_number: string
  license_valid_till: string
  country_id: string
  state_id: string
  city_id: string
  pincode_id: string
}

export default function AddTransportCompanyPage() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    user_id: '',
    company_name: '',
    address_line: '',
    registration_number: '',
    license_valid_till: '',
    country_id: '',
    state_id: '',
    city_id: '',
    pincode_id: ''
  })

  // Hooks
  const { createTransportCompany, loading, error } = useCreateTransportCompany()
  const { countries } = useCountries()
  const { states } = useStates(formData.country_id || undefined)
  const { cities } = useCities(formData.state_id || undefined)
  const { pincodes } = usePincodes(formData.city_id || undefined)

  // Users hook for transport company role
  const { users: transportCompanyUsers, loading: usersLoading } = useUsersByRole('transport_company')

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.user_id || !formData.company_name) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createTransportCompany(formData)
      setSuccess(true)
      toast.success('Transport company created successfully!')

      setTimeout(() => {
        router.push('/admin/transport-companies')
      }, 2000)
    } catch (err) {
      toast.error('Failed to create transport company')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/transport-companies">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transport Companies
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Transport Company</h1>
            <p className="text-gray-600">Create a new transport company record</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center text-green-800">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Transport company created successfully! Redirecting...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-800">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Assignment
            </CardTitle>
            <CardDescription>Select the user who will manage this transport company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="user_id">User *</Label>
              <Combobox
                options={transportCompanyUsers.map(user => ({
                  value: user.id,
                  label: `${user.full_name} (${user.email})`
                }))}
                value={formData.user_id}
                onValueChange={(value) => handleInputChange('user_id', value)}
                placeholder={usersLoading ? "Loading users..." : "Select a user"}
                searchPlaceholder="Search users..."
                emptyText="No users found"
                disabled={usersLoading}
                className="w-full"
              />
              {usersLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                  Loading transport company users...
                </p>
              )}
              {!usersLoading && transportCompanyUsers.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  No users with 'transport_company' role found. Please create users first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Company Information
            </CardTitle>
            <CardDescription>Basic company details and registration information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  placeholder="Enter registration number"
                />
              </div>
              <div>
                <Label htmlFor="license_valid_till">License Valid Till</Label>
                <Input
                  id="license_valid_till"
                  type="date"
                  value={formData.license_valid_till}
                  onChange={(e) => handleInputChange('license_valid_till', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address_line">Address</Label>
              <Textarea
                id="address_line"
                value={formData.address_line}
                onChange={(e) => handleInputChange('address_line', e.target.value)}
                placeholder="Enter company address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location Information
            </CardTitle>
            <CardDescription>Select the company's location details</CardDescription>
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
                  onValueChange={(value) => {
                    handleInputChange('country_id', value)
                    handleInputChange('state_id', '')
                    handleInputChange('city_id', '')
                    handleInputChange('pincode_id', '')
                  }}
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
                  onValueChange={(value) => {
                    handleInputChange('state_id', value)
                    handleInputChange('city_id', '')
                    handleInputChange('pincode_id', '')
                  }}
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
                  onValueChange={(value) => {
                    handleInputChange('city_id', value)
                    handleInputChange('pincode_id', '')
                  }}
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
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Link href="/admin/transport-companies">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || success}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Created
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Transport Company
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
