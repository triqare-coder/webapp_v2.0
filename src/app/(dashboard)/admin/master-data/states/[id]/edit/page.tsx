'use client'

import { use, useState, useEffect } from 'react'
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
import { LocationService } from '@/services/locationService'
import { DatabaseState } from '@/services/locationService'

interface FormData {
  country_id: string
  name: string
}

export default function EditStatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { updateState, loading } = useStateManagement()
  const { countries, loading: countriesLoading } = useCountries()

  const [formData, setFormData] = useState<FormData>({
    country_id: '',
    name: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchState = async () => {
      try {
        setInitialLoading(true)
        setLoadError(null)

        const result = await LocationService.getStateById(resolvedParams.id)
        
        if (result.error || !result.data) {
          setLoadError(result.error || 'State not found')
          return
        }

        setFormData({
          country_id: result.data.country_id,
          name: result.data.name
        })
      } catch (error) {
        console.error('Error fetching state:', error)
        setLoadError('Failed to load state information')
      } finally {
        setInitialLoading(false)
      }
    }

    fetchState()
  }, [resolvedParams.id])

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
      const result = await updateState(resolvedParams.id, formData.country_id, formData.name.trim())
      
      if (result.success) {
        toast.success('State updated successfully!')
        router.push(`/admin/master-data/states/${resolvedParams.id}`)
      } else {
        toast.error(result.error || 'Failed to update state')
      }
    } catch (error) {
      console.error('Error updating state:', error)
      toast.error('An unexpected error occurred')
    }
  }

  // Convert countries to combobox options
  const countryOptions: ComboboxOption[] = countries?.map(country => ({
    value: country.id,
    label: country.name
  })) || []

  if (initialLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading state information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading State</h2>
            <p className="text-muted-foreground mb-4">{loadError}</p>
            <Link href="/admin/master-data/states">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to States
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href={`/admin/master-data/states/${resolvedParams.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to State
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit State</h1>
            <p className="text-muted-foreground">Update state information</p>
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
            <CardDescription>Update the state information</CardDescription>
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
          <Link href={`/admin/master-data/states/${resolvedParams.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update State
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
