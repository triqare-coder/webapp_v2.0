'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Globe,
  Edit,
  ArrowLeft,
  MapPin,
  Building
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, use } from 'react'
import { useCountryManagement } from '@/hooks/useLocationManagement'
import { useStates } from '@/hooks/useLocations'
import { DatabaseCountry } from '@/services/locationService'

export default function ViewCountryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [country, setCountry] = useState<DatabaseCountry | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { getCountryById, loading, error } = useCountryManagement()
  const { states } = useStates(resolvedParams.id)

  useEffect(() => {
    const fetchCountry = async () => {
      setIsLoading(true)
      const result = await getCountryById(resolvedParams.id)
      
      if (result.success && result.data) {
        setCountry(result.data)
      }
      setIsLoading(false)
    }

    fetchCountry()
  }, [resolvedParams.id, getCountryById])

  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Country Details</h1>
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

  if (error || !country) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Country Details</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading country: {error || 'Country not found'}</p>
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
          <Link href="/admin/master-data/countries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Countries
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{country.name}</h1>
            <p className="text-gray-600">Country Details</p>
          </div>
        </div>
        <Link href={`/admin/master-data/countries/${country.id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Country
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">States</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{states?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              States in this country
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Country Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Country Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Country Name</label>
              <p className="text-lg font-semibold">{country.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Country ID</label>
              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                {country.id}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* States List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              States ({states?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {states && states.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {states.map((state) => (
                  <div key={state.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{state.name}</span>
                    <Link href={`/admin/master-data/states/${state.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No states found for this country.</p>
                <Link href="/admin/master-data/states/add">
                  <Button className="mt-4" size="sm">
                    Add State
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
