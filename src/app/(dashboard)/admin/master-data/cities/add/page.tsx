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
  Building,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import { useCityManagement } from '@/hooks/useLocationManagement'
import { useAllLocations } from '@/hooks/useLocations'

interface FormData {
  state_id: string
  name: string
}

export default function AddCityPage() {
  const router = useRouter()
  const { createCity, loading } = useCityManagement()
  const { states, countries, loading: locationsLoading } = useAllLocations()

  const [formData, setFormData] = useState<FormData>({
    state_id: '',
    name: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'City name is required'
    }

    if (!formData.state_id) {
      newErrors.state_id = 'State is required'
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
      const result = await createCity(formData.state_id, formData.name.trim())
      
      if (result.success) {
        toast.success('City created successfully!')
        router.push('/admin/master-data/cities')
      } else {
        toast.error(result.error || 'Failed to create city')
      }
    } catch (error) {
      console.error('Error creating city:', error)
      toast.error('An unexpected error occurred')
    }
  }

  // Convert states to combobox options with country information
  const stateOptions: ComboboxOption[] = states?.map(state => {
    const country = countries?.find(c => c.id === state.country_id)
    return {
      value: state.id,
      label: `${state.name} (${country?.name || 'Unknown Country'})`
    }
  }) || []

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin/master-data/cities">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cities
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Add New City</h1>
            <p className="text-muted-foreground">Create a new city in the system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              City Information
            </CardTitle>
            <CardDescription>Enter the basic information for the new city</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Combobox
                  options={stateOptions}
                  value={formData.state_id}
                  onValueChange={(value) => handleInputChange('state_id', value)}
                  placeholder="Select a state..."
                  searchPlaceholder="Search states..."
                  emptyText="No states found"
                  disabled={locationsLoading}
                />
                {errors.state_id && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.state_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">City Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter city name"
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
          <Link href="/admin/master-data/cities">
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
                Create City
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
