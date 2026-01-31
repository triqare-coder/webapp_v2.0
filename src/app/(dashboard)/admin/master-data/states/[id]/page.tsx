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
  MapPin,
  Globe,
  Building,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useStateManagement } from '@/hooks/useLocationManagement'
import { LocationService } from '@/services/locationService'
import { DatabaseState, DatabaseCountry, DatabaseCity } from '@/services/locationService'
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

interface StateWithDetails extends DatabaseState {
  country: DatabaseCountry
  cities: DatabaseCity[]
}

export default function ViewStatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { deleteState, loading: deleteLoading } = useStateManagement()

  const [state, setState] = useState<StateWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchState = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get state details
        const stateResult = await LocationService.getStateById(resolvedParams.id)
        if (stateResult.error || !stateResult.data) {
          setError(stateResult.error || 'State not found')
          return
        }

        // Get country details
        const countryResult = await LocationService.getCountryById(stateResult.data.country_id)
        if (countryResult.error || !countryResult.data) {
          setError('Failed to load country information')
          return
        }

        // Get cities in this state
        const citiesResult = await LocationService.getCitiesByState(stateResult.data.id)
        
        setState({
          ...stateResult.data,
          country: countryResult.data,
          cities: citiesResult.data || []
        })
      } catch (error) {
        console.error('Error fetching state:', error)
        setError('Failed to load state information')
      } finally {
        setLoading(false)
      }
    }

    fetchState()
  }, [resolvedParams.id])

  const handleDelete = async () => {
    if (!state) return

    try {
      const result = await deleteState(state.id)
      
      if (result.success) {
        toast.success('State deleted successfully!')
        router.push('/admin/master-data/states')
      } else {
        toast.error(result.error || 'Failed to delete state')
      }
    } catch (error) {
      console.error('Error deleting state:', error)
      toast.error('An unexpected error occurred')
    }
  }

  if (loading) {
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

  if (error || !state) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading State</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
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
          <Link href="/admin/master-data/states">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to States
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{state.name}</h1>
            <p className="text-muted-foreground">State details and information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/admin/master-data/states/${state.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleteLoading}>
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
                <AlertDialogTitle>Delete State</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{state.name}"? This action cannot be undone and will also delete all cities and pincodes in this state.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete State
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                State Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">State Name</Label>
                  <p className="text-lg font-semibold">{state.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <p className="text-lg font-semibold">{state.country.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Cities in {state.name}
                </div>
                <Badge variant="secondary">{state.cities.length} cities</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.cities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {state.cities.map((city) => (
                    <div key={city.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{city.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No cities found in this state</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Cities</span>
                <Badge variant="outline">{state.cities.length}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Country</span>
                <Badge variant="secondary">{state.country.name}</Badge>
              </div>
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
