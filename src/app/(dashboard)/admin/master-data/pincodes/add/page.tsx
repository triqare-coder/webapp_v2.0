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
  Hash,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building
} from 'lucide-react'
import Link from 'next/link'
import { usePincodeManagement } from '@/hooks/useLocationManagement'
import { useAllLocations } from '@/hooks/useLocations'

interface FormData {
  city_id: string
  code: string
}

export default function AddPincodePage() {
  const router = useRouter()
  const { createPincode, loading } = usePincodeManagement()
  const { cities, states, countries, loading: locationsLoading } = useAllLocations()

  const [formData, setFormData] = useState<FormData>({
    city_id: '',
    code: ''
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

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
      const result = await createPincode(formData.city_id, formData.code.trim())
      
      if (result.success) {
        toast.success('Pincode created successfully!')
        router.push('/admin/master-data/pincodes')
      } else {
        toast.error(result.error || 'Failed to create pincode')
      }
    } catch (error) {
      console.error('Error creating pincode:', error)
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin/master-data/pincodes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pincodes
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Add New Pincode</h1>
            <p className="text-muted-foreground">Create a new pincode in the system</p>
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
            <CardDescription>Enter the basic information for the new pincode</CardDescription>
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
          <Link href="/admin/master-data/pincodes">
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
                Create Pincode
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
