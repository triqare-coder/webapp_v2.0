'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { 
  Users, 
  ArrowLeft, 
  Save, 
  Phone, 
  Mail, 
  FileText,
  Building2,
  Truck
} from 'lucide-react'

interface FormData {
  full_name: string
  phone_number: string
  email: string
  license_number: string
  certification_documents: string
  status: 'active' | 'inactive'
}

interface TransportCompany {
  id: string
  name: string
  registration_number: string
}



export default function AddDriverPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [company, setCompany] = useState<TransportCompany | null>(null)
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone_number: '',
    email: '',
    license_number: '',
    certification_documents: '',
    status: 'active'
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    // In a real app, you would fetch the company from your API
    const fetchData = async () => {
      try {
        // Mock data - replace with actual API calls
        const mockCompany: TransportCompany = {
          id: params.id,
          name: 'Metro Emergency Transport',
          registration_number: 'TC-2024-001'
        }

        setCompany(mockCompany)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [params.id])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required'
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.license_number.trim()) {
      newErrors.license_number = 'License number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      // In a real app, you would call your API here
      const driverData = {
        ...formData,
        transport_company_id: params.id
      }
      console.log('Creating driver:', driverData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect to company drivers page
      router.push(`/admin/transport-companies/${params.id}/drivers`)
    } catch (error) {
      console.error('Error creating driver:', error)
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Company not found</h3>
              <Button onClick={() => router.push('/admin/transport-companies')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Companies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Add Driver
          </h1>
          <p className="text-gray-600">
            Add a new driver to {company.name} ({company.registration_number})
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Enter driver's full name"
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name}</p>
                )}
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <Label htmlFor="license_number">
                  License Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => handleInputChange('license_number', e.target.value)}
                    placeholder="DL-12345"
                    className={`pl-10 ${errors.license_number ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.license_number && (
                  <p className="text-sm text-red-500">{errors.license_number}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="driver@company.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone_number">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    placeholder="+1-555-0123"
                    className={`pl-10 ${errors.phone_number ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone_number && (
                  <p className="text-sm text-red-500">{errors.phone_number}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" }
                  ]}
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as 'active' | 'inactive')}
                  placeholder="Select status"
                  searchPlaceholder="Search status..."
                  emptyText="No status found."
                />
              </div>



              {/* Certification Documents */}
              <div className="space-y-2">
                <Label htmlFor="certification_documents">
                  Certifications & Documents
                </Label>
                <Textarea
                  id="certification_documents"
                  value={formData.certification_documents}
                  onChange={(e) => handleInputChange('certification_documents', e.target.value)}
                  placeholder="EMT-Basic, CPR, ACLS, etc."
                  className="min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  List relevant certifications, training, and documents (comma-separated)
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Driver
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium text-gray-900 mb-2">Driver Registration Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Full name must match official identification documents</li>
              <li>• License number should be unique and valid</li>
              <li>• Email address will be used for system notifications</li>
              <li>• Phone number should be accessible for emergency contact</li>
              <li>• Include all relevant certifications for proper qualification tracking</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
