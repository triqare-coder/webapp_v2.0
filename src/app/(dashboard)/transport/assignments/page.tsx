'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { toast } from 'sonner'

export default function AssignmentsPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [sosRequests, setSOSRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading drivers...')
        const driversResponse = await fetch('/api/transport/drivers')
        console.log('Drivers response status:', driversResponse.status)

        // Check if we got redirected to sign-in (HTML response)
        const contentType = driversResponse.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Authentication required. Please sign in as a transport company user.')
        }

        if (!driversResponse.ok) {
          const errorText = await driversResponse.text()
          console.error('Drivers API error:', errorText)
          throw new Error(`Failed to load drivers: ${driversResponse.status}`)
        }

        const driversResult = await driversResponse.json()
        console.log('Drivers result:', driversResult)

        // Load SOS requests to find current assignments
        console.log('Loading SOS requests...')
        const sosResponse = await fetch('/api/sos-requests')
        let sosRequestsData = []

        if (sosResponse.ok) {
          const sosResult = await sosResponse.json()
          sosRequestsData = sosResult.data || []
          console.log('SOS requests loaded:', sosRequestsData.length)
        } else {
          console.warn('Failed to load SOS requests, continuing without assignment data')
        }

        // Combine drivers with their current SOS requests
        const driversData = driversResult.drivers || []
        const driversWithAssignments = driversData.map((driver: any) => {
          // Find current SOS request using multiple methods:
          // 1. Check if driver_id matches (from sos_requests table)
          // 2. Check if current_request_id is set (from drivers table)
          const currentSOSRequest = sosRequestsData.find((request: any) => {
            // Match by driver_id in sos_requests table
            const matchesDriverId = request.driver_id === driver.user_id
            // Match by current_request_id in drivers table
            const matchesCurrentRequest = driver.current_request_id && request.id === driver.current_request_id
            // Only consider active requests
            const isActiveRequest = request.status !== 'completed' &&
                                  request.status !== 'cancelled' &&
                                  request.status !== 'resolved'

            return (matchesDriverId || matchesCurrentRequest) && isActiveRequest
          })

          // Determine display status based on multiple factors
          let displayStatus: 'Online' | 'Busy' | 'Inactive' = 'Inactive'

          if (driver.status === 'inactive' || !driver.is_available) {
            displayStatus = 'Inactive'
          } else if (currentSOSRequest || driver.current_request_id || driver.status === 'assigned' || driver.status === 'on_trip') {
            displayStatus = 'Busy'
          } else if (driver.status === 'available' && driver.is_available) {
            displayStatus = 'Online'
          }

          return {
            ...driver,
            currentSOSRequest,
            displayStatus
          }
        })

        setDrivers(driversWithAssignments)
        setSOSRequests(sosRequestsData)

        console.log('Final drivers with assignments:', driversWithAssignments)
        console.log('Status breakdown:', {
          total: driversWithAssignments.length,
          online: driversWithAssignments.filter((d: any) => d.displayStatus === 'Online').length,
          busy: driversWithAssignments.filter((d: any) => d.displayStatus === 'Busy').length,
          inactive: driversWithAssignments.filter((d: any) => d.displayStatus === 'Inactive').length
        })

        toast.success(`Loaded ${driversWithAssignments.length} drivers successfully`)
      } catch (error) {
        console.error('Error loading data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading assignments page...</p>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
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

        {/* Drivers List */}
        <div className="space-y-4">
          {drivers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers found</h3>
                <p className="text-gray-600">You haven't added any drivers yet.</p>
              </CardContent>
            </Card>
          ) : (
            drivers.map((driver) => (
              <Card key={driver.user_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {driver.user?.full_name 
                          ? driver.user.full_name.split(' ').map((n: string) => n[0]).join('') 
                          : driver.user?.email ? driver.user.email[0].toUpperCase() : '?'}
                      </div>

                      {/* Driver Details */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {driver.user?.full_name || driver.user?.email || 'Unknown Driver'}
                          </h3>
                          <Badge variant={
                            driver.displayStatus === 'Online' ? 'default' :
                            driver.displayStatus === 'Busy' ? 'destructive' : 'secondary'
                          }>
                            {driver.displayStatus}
                          </Badge>
                          {driver.is_verified && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Verified
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <div>Email: {driver.user?.email}</div>
                          <div>Phone: {driver.user?.phone || 'N/A'}</div>
                          <div>License: {driver.license_number}</div>
                          <div>Vehicle: {driver.vehicle_details || 'N/A'}</div>
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
                              <div>
                                <span className="font-medium text-gray-700">Requested:</span>
                                <span className="ml-2 text-gray-900">
                                  {new Date(driver.currentSOSRequest.requested_at).toLocaleString()}
                                </span>
                              </div>
                              {driver.currentSOSRequest.assigned_at && (
                                <div>
                                  <span className="font-medium text-gray-700">Assigned:</span>
                                  <span className="ml-2 text-gray-900">
                                    {new Date(driver.currentSOSRequest.assigned_at).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {driver.currentSOSRequest.location_lat && driver.currentSOSRequest.location_lon && (
                                <div>
                                  <span className="font-medium text-gray-700">Location:</span>
                                  <span className="ml-2 text-gray-900">
                                    {driver.currentSOSRequest.location_lat.toFixed(4)}, {driver.currentSOSRequest.location_lon.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              {driver.currentSOSRequest.patient_phone && (
                                <div>
                                  <span className="font-medium text-gray-700">Patient Contact:</span>
                                  <span className="ml-2 text-gray-900">{driver.currentSOSRequest.patient_phone}</span>
                                </div>
                              )}
                              {driver.current_request_id && (
                                <div className="col-span-2">
                                  <span className="font-medium text-gray-700">Driver Status:</span>
                                  <span className="ml-2 text-gray-900">
                                    {driver.status.replace('_', ' ').toUpperCase()}
                                    {driver.is_available ? ' (Available)' : ' (Unavailable)'}
                                  </span>
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
