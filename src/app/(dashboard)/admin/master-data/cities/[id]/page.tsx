'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  MapPin,
  Globe,
  Loader2,
  AlertCircle,
  Hash
} from 'lucide-react'
import Link from 'next/link'
import { useCityManagement } from '@/hooks/useLocationManagement'
import { LocationService } from '@/services/locationService'
import { DatabaseCity, DatabaseState, DatabaseCountry, DatabasePincode } from '@/services/locationService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface CityWithDetails extends DatabaseCity {
  state?: DatabaseState
  country?: DatabaseCountry
  pincodes?: DatabasePincode[]
}

interface ViewCityPageProps {
  params: Promise<{ id: string }>
}

export default function ViewCityPage({ params }: ViewCityPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { deleteCity, loading: deleteLoading } = useCityManagement()

  const [city, setCity] = useState<CityWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCityDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch city details
        const { data: cityData, error: cityError } = await LocationService.getCityById(resolvedParams.id)
        if (cityError || !cityData) {
          setError(cityError || 'City not found')
          return
        }

        // Fetch state details
        const { data: stateData } = await LocationService.getStateById(cityData.state_id)
        
        // Fetch country details if state exists
        let countryData = null
        if (stateData) {
          const { data: country } = await LocationService.getCountryById(stateData.country_id)
          countryData = country
        }

        // Fetch pincodes for this city
        const { data: cityPincodes } = await LocationService.getPincodesByCity(cityData.id)

        setCity({
          ...cityData,
          state: stateData || undefined,
          country: countryData || undefined,
          pincodes: cityPincodes || []
        })
      } catch (err) {
        console.error('Error fetching city details:', err)
        setError('Failed to load city details')
      } finally {
        setLoading(false)
      }
    }

    fetchCityDetails()
  }, [resolvedParams.id])

  const handleDelete = async () => {
    try {
      const result = await deleteCity(resolvedParams.id)
      
      if (result.success) {
        toast.success('City deleted successfully!')
        router.push('/admin/master-data/cities')
      } else {
        toast.error(result.error || 'Failed to delete city')
      }
    } catch (error) {
      console.error('Error deleting city:', error)
      toast.error('An unexpected error occurred')
    }
  }

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
          <Link href="/admin/master-data/cities">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cities
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{city.name}</h1>
            <p className="text-muted-foreground">City Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/admin/master-data/cities/${city.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteLoading}>
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete City</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{city.name}"? This action cannot be undone and will also delete all associated pincodes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* City Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                City Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">City Name</Label>
                  <p className="text-lg font-semibold">{city.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">City ID</Label>
                  <p className="text-sm font-mono text-muted-foreground">{city.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Hierarchy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Country:</span>
                <Badge variant="secondary">{city.country?.name || 'Unknown'}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">State:</span>
                <Badge variant="secondary">{city.state?.name || 'Unknown'}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">City:</span>
                <Badge variant="default">{city.name}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pincodes */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Hash className="h-5 w-5 mr-2" />
                  Pincodes
                </div>
                <Badge variant="outline">{city.pincodes?.length || 0}</Badge>
              </CardTitle>
              <CardDescription>Pincodes in this city</CardDescription>
            </CardHeader>
            <CardContent>
              {city.pincodes && city.pincodes.length > 0 ? (
                <div className="space-y-2">
                  {city.pincodes.map((pincode, index) => (
                    <div key={pincode.id}>
                      <div className="flex items-center justify-between py-2">
                        <span className="font-mono text-sm">{pincode.code}</span>
                        <Link href={`/admin/master-data/pincodes/${pincode.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                      {index < (city.pincodes?.length || 0) - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No pincodes found for this city</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
