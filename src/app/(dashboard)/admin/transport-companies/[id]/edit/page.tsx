'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Building2,
  ArrowLeft,
  Save,
  MapPin,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'
import { useTransportCompany, useUpdateTransportCompany } from '@/hooks/useTransportCompanies'
import { useCountries, useStates, useCities, usePincodes } from '@/hooks/useLocations'

interface FormData {
  company_name: string
  address_line: string
  registration_number: string
  license_valid_till: string
  is_verified: boolean
  country_id: string
  state_id: string
  city_id: string
  pincode_id: string
}

export default function EditTransportCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    address_line: '',
    registration_number: '',
    license_valid_till: '',
    is_verified: false,
    country_id: '',
    state_id: '',
    city_id: '',
    pincode_id: ''
  })

  // Hooks
  const { transportCompany, loading: loadingCompany, error: companyError } = useTransportCompany(resolvedParams.id)
  const { updateTransportCompany, loading, error } = useUpdateTransportCompany()
  const { countries } = useCountries()
  const { states } = useStates(formData.country_id || undefined)
  const { cities } = useCities(formData.state_id || undefined)
  const { pincodes } = usePincodes(formData.city_id || undefined)

  // Load existing data
  useEffect(() => {
    if (transportCompany) {
      setFormData({
        company_name: transportCompany.company_name || '',
        address_line: transportCompany.address_line || '',
        registration_number: transportCompany.registration_number || '',
        license_valid_till: transportCompany.license_valid_till || '',
        is_verified: transportCompany.is_verified || false,
        country_id: transportCompany.country_id || '',
        state_id: transportCompany.state_id || '',
        city_id: transportCompany.city_id || '',
        pincode_id: transportCompany.pincode_id || ''
      })
    }
  }, [transportCompany])

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateTransportCompany(resolvedParams.id, formData)
      setSuccess(true)
      toast.success('Transport company updated successfully!')

      setTimeout(() => {
        router.push('/admin/transport-companies')
      }, 2000)
    } catch (err) {
      toast.error('Failed to update transport company')
    }
  }

  if (loadingCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Transport Company</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (companyError || !transportCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Transport Company</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Error loading transport company: {companyError || 'Company not found'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Transport Company</h1>
            <p className="text-gray-600">Update transport company information</p>
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
                <span>Transport company updated successfully! Redirecting...</span>
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

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Company Information
            </CardTitle>
            <CardDescription>Update basic company details and registration information</CardDescription>
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

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Verification Status
            </CardTitle>
            <CardDescription>Manage company verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_verified"
                checked={formData.is_verified}
                onCheckedChange={(checked) => handleInputChange('is_verified', checked)}
              />
              <Label htmlFor="is_verified" className="flex items-center">
                {formData.is_verified ? (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-1 text-green-600" />
                    Verified Company
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-1 text-yellow-600" />
                    Pending Verification
                  </>
                )}
              </Label>
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
            <CardDescription>Update the company's location details</CardDescription>
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
                Updating...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Updated
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Transport Company
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

