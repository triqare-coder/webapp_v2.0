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
  Hash,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { usePincodeManagement } from '@/hooks/useLocationManagement'
import { useAllLocations } from '@/hooks/useLocations'
import { LocationService } from '@/services/locationService'
import { DatabasePincode } from '@/services/locationService'

interface FormData {
  city_id: string
  code: string
}

interface EditPincodePageProps {
  params: Promise<{ id: string }>
}

export default function EditPincodePage({ params }: EditPincodePageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { updatePincode, loading: updateLoading } = usePincodeManagement()
  const { cities, states, countries, loading: locationsLoading } = useAllLocations()

  const [pincode, setPincode] = useState<DatabasePincode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    city_id: '',
    code: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    const fetchPincode = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await LocationService.getPincodeById(resolvedParams.id)
        
        if (fetchError || !data) {
          setError(fetchError || 'Pincode not found')
          return
        }

        setPincode(data)
        setFormData({
          city_id: data.city_id,
          code: data.code
        })
      } catch (err) {
        console.error('Error fetching pincode:', err)
        setError('Failed to load pincode details')
      } finally {
        setLoading(false)
      }
    }

    fetchPincode()
  }, [resolvedParams.id])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Pincode is required'
    } else if (!/^\d{6}$/.test(formData.code.trim())) {
      newErrors.code = 'Pincode must be exactly 6 digits'
    }

    if (!formData.city_id) {
      newErrors.city_id = 'City is required'
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
      const result = await updatePincode(resolvedParams.id, formData.city_id, formData.code.trim())
      
      if (result.success) {
        toast.success('Pincode updated successfully!')
        router.push(`/admin/master-data/pincodes/${resolvedParams.id}`)
      } else {
        toast.error(result.error || 'Failed to update pincode')
      }
    } catch (error) {
      console.error('Error updating pincode:', error)
      toast.error('An unexpected error occurred')
    }
  }

  // Convert cities to combobox options with state and country information
  const cityOptions: ComboboxOption[] = cities?.map(city => {
    const state = states?.find(s => s.id === city.state_id)
    const country = countries?.find(c => c.id === state?.country_id)
    return {
      value: city.id,
      label: `${city.name}, ${state?.name || 'Unknown State'}, ${country?.name || 'Unknown Country'}`
    }
  }) || []

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading pincode details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !pincode) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Pincode</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/admin/master-data/pincodes">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pincodes
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
          <Link href={`/admin/master-data/pincodes/${pincode.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pincode
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Pincode</h1>
            <p className="text-muted-foreground">Update pincode information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Pincode Information
            </CardTitle>
            <CardDescription>Update the pincode information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Combobox
                  options={cityOptions}
                  value={formData.city_id}
                  onValueChange={(value) => handleInputChange('city_id', value)}
                  placeholder="Select a city..."
                  searchPlaceholder="Search cities..."
                  emptyText="No cities found"
                  disabled={locationsLoading}
                />
                {errors.city_id && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.city_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Pincode *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.code}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a 6-digit numeric pincode
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link href={`/admin/master-data/pincodes/${pincode.id}`}>
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
                Update Pincode
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
