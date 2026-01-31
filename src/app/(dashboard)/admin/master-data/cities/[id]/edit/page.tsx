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
  Building,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useCityManagement } from '@/hooks/useLocationManagement'
import { useAllLocations } from '@/hooks/useLocations'
import { LocationService } from '@/services/locationService'
import { DatabaseCity } from '@/services/locationService'

interface FormData {
  state_id: string
  name: string
}

interface EditCityPageProps {
  params: Promise<{ id: string }>
}

export default function EditCityPage({ params }: EditCityPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { updateCity, loading: updateLoading } = useCityManagement()
  const { states, countries, loading: locationsLoading } = useAllLocations()

  const [city, setCity] = useState<DatabaseCity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    state_id: '',
    name: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    const fetchCity = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await LocationService.getCityById(resolvedParams.id)
        
        if (fetchError || !data) {
          setError(fetchError || 'City not found')
          return
        }

        setCity(data)
        setFormData({
          state_id: data.state_id,
          name: data.name
        })
      } catch (err) {
        console.error('Error fetching city:', err)
        setError('Failed to load city details')
      } finally {
        setLoading(false)
      }
    }

    fetchCity()
  }, [resolvedParams.id])

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
      const result = await updateCity(resolvedParams.id, formData.state_id, formData.name.trim())
      
      if (result.success) {
        toast.success('City updated successfully!')
        router.push(`/admin/master-data/cities/${resolvedParams.id}`)
      } else {
        toast.error(result.error || 'Failed to update city')
      }
    } catch (error) {
      console.error('Error updating city:', error)
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading city details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !city) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading City</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/admin/master-data/cities">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cities
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
          <Link href={`/admin/master-data/cities/${city.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to City
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit City</h1>
            <p className="text-muted-foreground">Update city information</p>
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
            <CardDescription>Update the city information</CardDescription>
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
          <Link href={`/admin/master-data/cities/${city.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateLoading}>
            {updateLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update City
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
