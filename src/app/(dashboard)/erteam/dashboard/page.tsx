'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { DownloadAppButton } from '@/components/DownloadAppButton'
import {
  AlertTriangle,
  Truck,
  MapPin,
  Clock,
  Activity,
  Phone,
  Users,
  CheckCircle,
  XCircle,
  Zap,
  Navigation,
  Timer
} from 'lucide-react'
import { toast } from 'sonner'

interface ERTDashboardStats {
  activeEmergencies: number
  availableAmbulances: number
  onDutyDrivers: number
  avgResponseTime: string
  completedToday: number
  pendingAssignments: number
  criticalCases: number
  highPriorityCases: number
  activeCases: Array<{
    id: string
    patient_name: string
    patient_phone: string
    location: string
    severity: string
    status: string
    created_at: string
    assigned_driver_id: string | null
    drivers?: {
      id: string
      first_name: string
      last_name: string
      phone_number: string
    }
  }>
  totalDrivers: number
}

export default function ERTDashboardPage() {
  const [stats, setStats] = useState<ERTDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardStats()
    // Set up polling for real-time updates
    const interval = setInterval(fetchDashboardStats, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/erteam/dashboard/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard stats')
      }

      if (data.success) {
        setStats(data.stats)
      } else {
        throw new Error(data.error || 'Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching ERT dashboard stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      if (loading) { // Only show toast on initial load, not on polling errors
        toast.error('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'dispatched': return 'bg-blue-100 text-blue-800'
      case 'en-route': return 'bg-purple-100 text-purple-800'
      case 'maintenance': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['ert']}>
        <div className="p-6 space-y-6">
          <LoadingSkeleton />
        </div>
      </RoleGuard>
    )
  }

  if (error || !stats) {
    return (
      <RoleGuard allowedRoles={['ert']}>
        <div className="p-6 space-y-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardStats}>
              Try Again
            </Button>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['ert']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🚨 ERT Command Center
            </h1>
            <p className="text-gray-600">
              Emergency Response Team operational dashboard
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <DownloadAppButton />
            <Badge className="bg-blue-100 text-blue-800">
              <Activity className="h-3 w-3 mr-1" />
              Emergency Response Team
            </Badge>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => router.push('/erteam/sos')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Create SOS Alert
            </Button>
          </div>
        </div>

        {/* Critical Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Active Emergencies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{stats.activeEmergencies}</div>
              <p className="text-xs text-red-600">
                {stats.criticalCases} critical, {stats.highPriorityCases} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Ambulances</CardTitle>
              <Truck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.availableAmbulances}</div>
              <p className="text-xs text-muted-foreground">
                Ready for dispatch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Duty Drivers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.onDutyDrivers}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalDrivers} total drivers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">
                Recent average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Successfully resolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
              <Timer className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingAssignments}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting dispatch
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Emergencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Emergency Cases ({stats.activeCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.activeCases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No active emergencies at the moment</p>
                <p className="text-sm">All systems operational</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.activeCases.map((emergency) => (
                  <div key={emergency.id} className={`p-4 rounded-lg border-2 ${getPriorityColor(emergency.severity)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="font-mono">
                          SOS-{emergency.id}
                        </Badge>
                        <Badge className={getPriorityColor(emergency.severity)}>
                          {emergency.severity.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(emergency.status)}>
                          {emergency.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(emergency.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Patient</p>
                        <p className="text-gray-900">{emergency.patient_name}</p>
                        <p className="text-sm text-gray-600">{emergency.patient_phone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Location</p>
                        <p className="text-gray-900 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {emergency.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Assigned Driver</p>
                        <p className="text-gray-900">
                          {emergency.drivers ?
                            `${emergency.drivers.first_name} ${emergency.drivers.last_name}` :
                            'Not assigned'
                          }
                        </p>
                        {emergency.drivers && (
                          <p className="text-sm text-gray-600">{emergency.drivers.phone_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      {!emergency.assigned_driver_id && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Phone className="h-4 w-4 mr-1" />
                          Assign Driver
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/erteam/sos/${emergency.id}`)}
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>



        {/* ERT Quick Actions */}
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
                <AlertTriangle className="h-6 w-6 mb-2 text-red-600" />
                Create SOS Alert
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <MapPin className="h-6 w-6 mb-2" />
                Live Map View
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Phone className="h-6 w-6 mb-2" />
                Dispatch Center
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Navigation className="h-6 w-6 mb-2" />
                Route Optimization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
