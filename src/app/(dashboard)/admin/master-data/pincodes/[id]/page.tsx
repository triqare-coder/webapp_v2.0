'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Hash,
  Building,
  MapPin,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { usePincodeManagement } from '@/hooks/useLocationManagement'
import { LocationService } from '@/services/locationService'
import { DatabasePincode, DatabaseCity, DatabaseState, DatabaseCountry } from '@/services/locationService'
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

interface PincodeWithDetails extends DatabasePincode {
  city?: DatabaseCity
  state?: DatabaseState
  country?: DatabaseCountry
}

interface ViewPincodePageProps {
  params: Promise<{ id: string }>
}

export default function ViewPincodePage({ params }: ViewPincodePageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { deletePincode, loading: deleteLoading } = usePincodeManagement()

  const [pincode, setPincode] = useState<PincodeWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPincodeDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch pincode details
        const { data: pincodeData, error: pincodeError } = await LocationService.getPincodeById(resolvedParams.id)
        if (pincodeError || !pincodeData) {
          setError(pincodeError || 'Pincode not found')
          return
        }

        // Fetch city details
        const { data: cityData } = await LocationService.getCityById(pincodeData.city_id)
        
        // Fetch state details if city exists
        let stateData = null
        if (cityData) {
          const { data: state } = await LocationService.getStateById(cityData.state_id)
          stateData = state
        }

        // Fetch country details if state exists
        let countryData = null
        if (stateData) {
          const { data: country } = await LocationService.getCountryById(stateData.country_id)
          countryData = country
        }

        setPincode({
          ...pincodeData,
          city: cityData || undefined,
          state: stateData || undefined,
          country: countryData || undefined
        })
      } catch (err) {
        console.error('Error fetching pincode details:', err)
        setError('Failed to load pincode details')
      } finally {
        setLoading(false)
      }
    }

    fetchPincodeDetails()
  }, [resolvedParams.id])

  const handleDelete = async () => {
    try {
      const result = await deletePincode(resolvedParams.id)
      
      if (result.success) {
        toast.success('Pincode deleted successfully!')
        router.push('/admin/master-data/pincodes')
      } else {
        toast.error(result.error || 'Failed to delete pincode')
      }
    } catch (error) {
      console.error('Error deleting pincode:', error)
      toast.error('An unexpected error occurred')
    }
  }

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
          <Link href="/admin/master-data/pincodes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pincodes
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">{pincode.code}</h1>
            <p className="text-muted-foreground">Pincode Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/admin/master-data/pincodes/${pincode.id}/edit`}>
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
                <AlertDialogTitle>Delete Pincode</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete pincode "{pincode.code}"? This action cannot be undone.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pincode Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Pincode Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pincode</Label>
                <p className="text-2xl font-bold font-mono">{pincode.code}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pincode ID</Label>
                <p className="text-sm font-mono text-muted-foreground">{pincode.id}</p>
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
            <CardDescription>Complete location information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Country:</span>
                <Badge variant="secondary">{pincode.country?.name || 'Unknown'}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">State:</span>
                <Badge variant="secondary">{pincode.state?.name || 'Unknown'}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">City:</span>
                <Badge variant="secondary">{pincode.city?.name || 'Unknown'}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Pincode:</span>
                <Badge variant="default" className="font-mono">{pincode.code}</Badge>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Quick Navigation</Label>
              <div className="flex flex-wrap gap-2">
                {pincode.country && (
                  <Link href={`/admin/master-data/countries/${pincode.country.id}`}>
                    <Button variant="outline" size="sm">
                      <Globe className="h-3 w-3 mr-1" />
                      {pincode.country.name}
                    </Button>
                  </Link>
                )}
                {pincode.state && (
                  <Link href={`/admin/master-data/states/${pincode.state.id}`}>
                    <Button variant="outline" size="sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {pincode.state.name}
                    </Button>
                  </Link>
                )}
                {pincode.city && (
                  <Link href={`/admin/master-data/cities/${pincode.city.id}`}>
                    <Button variant="outline" size="sm">
                      <Building className="h-3 w-3 mr-1" />
                      {pincode.city.name}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>
}
