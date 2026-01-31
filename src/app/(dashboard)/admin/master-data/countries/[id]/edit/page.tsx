'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Globe,
  Save,
  X,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useCountryManagement } from '@/hooks/useLocationManagement'
import { DatabaseCountry } from '@/services/locationService'

interface FormData {
  name: string
}

export default function EditCountryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { getCountryById, updateCountry, loading, error } = useCountryManagement()

  const [country, setCountry] = useState<DatabaseCountry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    name: ''
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    const fetchCountry = async () => {
      setIsLoading(true)
      const result = await getCountryById(resolvedParams.id)
      
      if (result.success && result.data) {
        setCountry(result.data)
        setFormData({
          name: result.data.name
        })
      }
      setIsLoading(false)
    }

    fetchCountry()
  }, [resolvedParams.id, getCountryById])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Country name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Country name must be at least 2 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !country) {
      return
    }

    const result = await updateCountry(country.id, formData.name.trim())

    if (result.success) {
      router.push(`/admin/master-data/countries/${country.id}`)
    }
  }

  const handleCancel = () => {
    router.push(`/admin/master-data/countries/${resolvedParams.id}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Country</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading country details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!country) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Country</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Country not found</p>
              <Link href="/admin/master-data/countries">
                <Button className="mt-4">
                  Back to Countries
                </Button>
              </Link>
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
          <Link href={`/admin/master-data/countries/${country.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Country
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Country</h1>
            <p className="text-gray-600">Update country information</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Country Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <X className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error updating country
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Country ID (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="id">Country ID</Label>
                <Input
                  id="id"
                  value={country.id}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              {/* Country Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Country Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter country name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Updating...' : 'Update Country'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
