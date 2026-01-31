'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe
} from 'lucide-react'
import Link from 'next/link'
import { useStateManagement } from '@/hooks/useLocationManagement'
import { useCountries } from '@/hooks/useLocations'

interface FormData {
  country_id: string
  name: string
}

export default function AddStatePage() {
  const router = useRouter()
  const { createState, loading } = useStateManagement()
  const { countries, loading: countriesLoading } = useCountries()

  const [formData, setFormData] = useState<FormData>({
    country_id: '',
    name: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'State name is required'
    }

    if (!formData.country_id) {
      newErrors.country_id = 'Country is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    try {
      const result = await createState(formData.country_id, formData.name.trim())
      
      if (result.success) {
        toast.success('State created successfully!')
        router.push('/admin/master-data/states')
      } else {
        toast.error(result.error || 'Failed to create state')
      }
    } catch (error) {
      console.error('Error creating state:', error)
      toast.error('An unexpected error occurred')
    }
  }

  // Convert countries to combobox options
  const countryOptions: ComboboxOption[] = countries?.map(country => ({
    value: country.id,
    label: country.name
  })) || []

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin/master-data/states">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to States
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Add New State</h1>
            <p className="text-muted-foreground">Create a new state in the system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              State Information
            </CardTitle>
            <CardDescription>Enter the basic information for the new state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Combobox
                  options={countryOptions}
                  value={formData.country_id}
                  onValueChange={(value) => handleInputChange('country_id', value)}
                  placeholder="Select a country..."
                  searchPlaceholder="Search countries..."
                  emptyText="No countries found"
                  disabled={countriesLoading}
                />
                {errors.country_id && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.country_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">State Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter state name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href="/admin/master-data/states">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create State
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
