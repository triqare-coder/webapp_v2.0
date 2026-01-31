'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Search,
  MapPin,
  Phone,
  Car,
  Mail,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Navigation,
  User,
  Activity,
  RefreshCw
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { toast } from 'sonner'
import Link from 'next/link'

interface Driver {
  user_id: string
  transport_company_id: string
  license_number: string
  aadhar_number?: string
  is_verified: boolean
  status: 'available' | 'assigned' | 'on_trip' | 'inactive'
  current_request_id?: string
  latitude?: number
  longitude?: number
  last_updated_at: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  address_line?: string
  firstname?: string
  lastname?: string
  vehicle_details?: string
  is_available: boolean
  user: {
    id: string
    full_name: string
    email: string
    phone: string
    first_name: string
    last_name: string
  }
}

interface SOSRequest {
  id: string
  patient_id: string
  requested_at: string
  assigned_at?: string
  completed_at?: string
  auto_assigned: boolean
  status: string
  location_lat?: number
  location_lon?: number
  patient_name?: string
  patient_phone?: string
  driver_id?: string
  driver_name?: string
  driver_phone?: string
  status_history: any[]
}

interface DriverWithAssignment extends Driver {
  currentSOSRequest?: SOSRequest
  displayStatus: 'Online' | 'Busy' | 'Inactive'
}

export default function AssignmentsPage() {
  const [drivers, setDrivers] = useState<DriverWithAssignment[]>([])
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  // Load drivers and SOS requests
  const loadData = async () => {
    try {
      setLoading(true)

      // Load drivers for this transport company
      const driversResponse = await fetch('/api/transport/drivers')
      const driversResult = await driversResponse.json()

      if (!driversResponse.ok) {
        throw new Error(driversResult.error || 'Failed to load drivers')
      }

      // Load all SOS requests to find current assignments
      const sosResponse = await fetch('/api/sos-requests')
      const sosResult = await sosResponse.json()

      if (!sosResponse.ok) {
        throw new Error(sosResult.error || 'Failed to load SOS requests')
      }

      const driversData = driversResult.drivers || []
      const sosRequestsData = sosResult.data || []

      // Combine drivers with their current SOS requests
      const driversWithAssignments: DriverWithAssignment[] = driversData.map((driver: Driver) => {
        // Find current SOS request for this driver
        const currentSOSRequest = sosRequestsData.find((request: SOSRequest) =>
          request.driver_id === driver.user_id &&
          request.status !== 'completed' &&
          request.status !== 'cancelled'
        )

        // Determine display status based on driver status and current assignments
        let displayStatus: 'Online' | 'Busy' | 'Inactive' = 'Inactive'

        if (driver.status === 'inactive' || !driver.is_available) {
          displayStatus = 'Inactive'
        } else if (currentSOSRequest || driver.current_request_id) {
          displayStatus = 'Busy'
        } else if (driver.status === 'available' && driver.is_available) {
          displayStatus = 'Online'
        } else {
          displayStatus = 'Online' // Default for other statuses when available
        }

        return {
          ...driver,
          currentSOSRequest,
          displayStatus
        }
      })

      setDrivers(driversWithAssignments)
      setSOSRequests(sosRequestsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success('Data refreshed successfully')
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = !searchQuery ||
      (driver.user.full_name && driver.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.user.email && driver.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.license_number && driver.license_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.vehicle_details && driver.vehicle_details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.firstname && driver.firstname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.lastname && driver.lastname.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = !statusFilter || driver.displayStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Online':
        return 'default' // Green
      case 'Busy':
        return 'destructive' // Red
      case 'Inactive':
        return 'secondary' // Gray
      default:
        return 'outline'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Online':
        return <CheckCircle className="h-4 w-4" />
      case 'Busy':
        return <AlertTriangle className="h-4 w-4" />
      case 'Inactive':
        return <Clock className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={['transport_company']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Assignments</h1>
            <p className="text-gray-600">Monitor your drivers and their current assignments</p>
          </div>
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                  <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Online</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {drivers.filter(d => d.displayStatus === 'Online').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Busy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {drivers.filter(d => d.displayStatus === 'Busy').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {drivers.filter(d => d.displayStatus === 'Inactive').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search drivers by name, email, license, or vehicle details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Online">Online</option>
            <option value="Busy">Busy</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Drivers List */}
        <div className="space-y-4">
          {filteredDrivers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter
                    ? 'No drivers match your current filters.'
                    : 'You haven\'t added any drivers yet.'}
                </p>
                {!searchQuery && !statusFilter && (
                  <Link href="/transport/drivers">
                    <Button className="mt-4">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Drivers
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredDrivers.map((driver) => (
              <Card key={driver.user_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Driver Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {driver.user.full_name
                          ? driver.user.full_name.split(' ').map(n => n[0]).join('')
                          : driver.user.email ? driver.user.email[0].toUpperCase() : '?'}
                      </div>

                      {/* Driver Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {driver.user.full_name || driver.user.email || 'Unknown Driver'}
                          </h3>
                          <Badge
                            variant={getStatusBadgeVariant(driver.displayStatus)}
                            className="flex items-center space-x-1"
                          >
                            {getStatusIcon(driver.displayStatus)}
                            <span>{driver.displayStatus}</span>
                          </Badge>
                          {driver.is_verified && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span>{driver.user.email}</span>
                          </div>
                          {driver.user.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{driver.user.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>License: {driver.license_number}</span>
                          </div>
                          {driver.vehicle_details && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Car className="h-4 w-4" />
                              <span>{driver.vehicle_details}</span>
                            </div>
                          )}
                          {driver.address_line && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{driver.address_line}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Activity className="h-4 w-4" />
                            <span>Status: {driver.status} {driver.is_available ? '(Available)' : '(Unavailable)'}</span>
                          </div>
                        </div>

                        {/* Current SOS Request */}
                        {driver.currentSOSRequest ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="font-medium text-red-800">Current SOS Request</span>
                              <Badge variant="destructive" className="text-xs">
                                {driver.currentSOSRequest.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Patient:</span>
                                <span className="ml-2 text-gray-900">
                                  {driver.currentSOSRequest.patient_name || 'Unknown Patient'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Request ID:</span>
                                <span className="ml-2 text-gray-900">
                                  SOS-{driver.currentSOSRequest.id.slice(-8).toUpperCase()}
                                </span>
                              </div>
                              {driver.currentSOSRequest.location_lat && driver.currentSOSRequest.location_lon && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium text-gray-700">Location:</span>
                                  <span className="ml-1 text-gray-900">
                                    {driver.currentSOSRequest.location_lat.toFixed(4)}, {driver.currentSOSRequest.location_lon.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Navigation className="h-3 w-3 text-gray-500" />
                                <span className="font-medium text-gray-700">Destination:</span>
                                <span className="ml-1 text-gray-900">Nearest Hospital</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-500" />
                                <span className="font-medium text-gray-700">Requested:</span>
                                <span className="ml-1 text-gray-900">
                                  {new Date(driver.currentSOSRequest.requested_at).toLocaleString()}
                                </span>
                              </div>
                              {driver.currentSOSRequest.assigned_at && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium text-gray-700">Assigned:</span>
                                  <span className="ml-1 text-gray-900">
                                    {new Date(driver.currentSOSRequest.assigned_at).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {driver.currentSOSRequest.patient_phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium text-gray-700">Patient Contact:</span>
                                  <span className="ml-1 text-gray-900">{driver.currentSOSRequest.patient_phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">
                                {driver.displayStatus === 'Online' ? 'Available for assignments' : 'No current assignment'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2">
                      <Link href={`/transport/drivers/${driver.user_id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {driver.currentSOSRequest && (
                        <Link href={`/sos/${driver.currentSOSRequest.id}`}>
                          <Button variant="outline" size="sm">
                            View SOS Request
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
