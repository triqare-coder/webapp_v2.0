'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Truck,
  Building2,
  Navigation,
  Zap,
  Clock,
  Phone,
  Activity,
  Users,
  RefreshCw,
  Loader2
} from 'lucide-react'
import LiveTrackingMap, { MapMarker } from '@/components/maps/LiveTrackingMap'
import { toast } from 'sonner'

interface LocationData {
  users: Array<{
    id: string
    full_name: string
    email: string
    role: string
    phone?: string
    is_active: boolean
    latitude: number
    longitude: number
    status?: string
    company_name?: string
  }>
  hospitals: Array<{
    id: string
    name: string
    latitude: number
    longitude: number
    status: string
    phone?: string
  }>
}

export default function ERTMapPage() {
  const router = useRouter()
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch location data
  const fetchLocations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch('/api/users/locations')
      const result = await response.json()

      if (result.success) {
        console.log('=== Location Data Received ===')
        console.log('Users:', result.data.users?.length || 0)
        console.log('Hospitals:', result.data.hospitals?.length || 0)
        console.log('Sample user:', result.data.users?.[0])
        setLocationData(result.data)
        setLastUpdated(new Date())
      } else {
        console.error('API returned error:', result)
        toast.error('Failed to load locations')
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast.error('Failed to fetch location data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchLocations(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchLocations])

  // Convert location data to map markers
  const mapMarkers: MapMarker[] = [
    // Driver/Patient markers
    ...(locationData?.users || []).map(user => {
      const marker = {
        id: user.id,
        lat: user.latitude,
        lng: user.longitude,
        type: (user.role === 'driver' ? 'driver' : 'patient') as MapMarker['type'],
        name: user.full_name || 'Unknown',
        status: user.status,
        info: user.company_name ? `Company: ${user.company_name}` : undefined
      }
      return marker
    }),
    // Hospital markers
    ...(locationData?.hospitals || []).map(hospital => ({
      id: hospital.id,
      lat: parseFloat(String(hospital.latitude)),
      lng: parseFloat(String(hospital.longitude)),
      type: 'hospital' as const,
      name: hospital.name,
      status: hospital.status,
      info: hospital.phone ? `Phone: ${hospital.phone}` : undefined
    }))
  ]

  // Debug log markers
  console.log('=== Map Markers ===')
  console.log('Total markers:', mapMarkers.length)
  console.log('Driver markers:', mapMarkers.filter(m => m.type === 'driver').length)
  console.log('Patient markers:', mapMarkers.filter(m => m.type === 'patient').length)
  console.log('Hospital markers:', mapMarkers.filter(m => m.type === 'hospital').length)
  if (mapMarkers.length > 0) {
    console.log('First marker:', mapMarkers[0])
  }

  // Summary counts
  const counts = {
    drivers: locationData?.users?.filter(u => u.role === 'driver').length || 0,
    patients: locationData?.users?.filter(u => u.role === 'patient').length || 0,
    hospitals: locationData?.hospitals?.length || 0,
    total: mapMarkers.length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'on_trip': return 'bg-purple-100 text-purple-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🗺️ Live Map View
            </h1>
            <p className="text-gray-600">
              Real-time tracking of drivers, patients, and hospitals
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-blue-100 text-blue-800">
              <Activity className="h-3 w-3 mr-1" />
              ERT Access
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLocations(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Clock className="h-4 w-4 mr-2" />
              Auto {autoRefresh ? 'On' : 'Off'}
            </Button>
            <Button onClick={() => router.push('/erteam/sos')}>
              <Zap className="h-4 w-4 mr-2" />
              Create Emergency
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Drivers</p>
                  <p className="text-2xl font-bold text-green-600">{counts.drivers}</p>
                </div>
                <Truck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Patients</p>
                  <p className="text-2xl font-bold text-blue-600">{counts.patients}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Hospitals</p>
                  <p className="text-2xl font-bold text-red-600">{counts.hospitals}</p>
                </div>
                <Building2 className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Markers</p>
                  <p className="text-2xl font-bold text-purple-600">{counts.total}</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Tracking Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <span className="text-gray-600">Loading map data...</span>
                    </div>
                  </div>
                ) : (
                  <LiveTrackingMap
                    markers={mapMarkers}
                    className="h-[500px]"
                    onMarkerClick={(marker) => {
                      toast.info(`Selected: ${marker.name} (${marker.type})`)
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Patients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Patients ({locationData?.users?.filter(u => u.role === 'patient').length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {locationData?.users?.filter(u => u.role === 'patient').length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No patients with location data</p>
                  ) : (
                    locationData?.users?.filter(u => u.role === 'patient').map((patient) => (
                      <div key={patient.id} className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{patient.full_name}</span>
                          <Badge className="bg-blue-100 text-blue-800">Patient</Badge>
                        </div>
                        {patient.phone && (
                          <div className="text-xs text-gray-600 mb-1">
                            📞 {patient.phone}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          📍 {patient.latitude.toFixed(4)}, {patient.longitude.toFixed(4)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Drivers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-500" />
                  Active Drivers ({locationData?.users?.filter(u => u.role === 'driver').length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {locationData?.users?.filter(u => u.role === 'driver').length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No drivers with location data</p>
                  ) : (
                    locationData?.users?.filter(u => u.role === 'driver').map((driver) => (
                      <div key={driver.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{driver.full_name}</span>
                          <Badge className={getStatusColor(driver.status || 'available')}>
                            {driver.status || 'available'}
                          </Badge>
                        </div>
                        {driver.company_name && (
                          <div className="text-xs text-gray-600 mb-1">
                            Company: {driver.company_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          📍 {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hospitals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-red-500" />
                  Hospitals ({locationData?.hospitals?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {locationData?.hospitals?.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hospitals with location data</p>
                  ) : (
                    locationData?.hospitals?.map((hospital) => (
                      <div key={hospital.id} className="p-3 border rounded-lg">
                        <div className="font-medium text-sm mb-1">{hospital.name}</div>
                        {hospital.phone && (
                          <div className="text-xs text-gray-600 mb-1">
                            <Phone className="h-3 w-3 inline mr-1" />
                            {hospital.phone}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          📍 {parseFloat(String(hospital.latitude)).toFixed(4)}, {parseFloat(String(hospital.longitude)).toFixed(4)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Response Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col bg-red-50 hover:bg-red-100 border-red-200"
                onClick={() => router.push('/erteam/sos')}
              >
                <Zap className="h-6 w-6 mb-2 text-red-600" />
                Create Emergency
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Truck className="h-6 w-6 mb-2" />
                Dispatch Ambulance
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Navigation className="h-6 w-6 mb-2" />
                Route Optimization
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Phone className="h-6 w-6 mb-2" />
                Emergency Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
