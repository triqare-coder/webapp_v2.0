'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { toast } from 'sonner'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  Award,
  Target,
  Activity,
  Calendar,
  BarChart3,
  Eye,
  Download,
  UserCheck,
  Loader2,
  AlertTriangle
} from 'lucide-react'

interface DriverPerformance {
  id: string
  name: string
  email: string
  phone: string
  employeeId: string
  totalTrips: number
  completedTrips: number
  avgResponseTime: string
  onTimePercentage: number
  status: string
  isVerified: boolean
  trend: 'up' | 'down' | 'stable'
  lastMonth: {
    trips: number
  }
}

export default function DriverPerformancePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('trips')
  const [timeFilter, setTimeFilter] = useState('month')
  const [drivers, setDrivers] = useState<DriverPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDriverPerformance()
  }, [])

  const fetchDriverPerformance = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/transport/drivers/performance')

      console.log('API Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('API Response data:', data)

        if (data.success) {
          setDrivers(data.drivers || [])
          if (data.message) {
            console.log('API Message:', data.message)
          }
        } else {
          throw new Error(data.error || 'Failed to fetch driver performance')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error response:', errorData)

        const errorMessage = errorData.error || `Server error: ${response.status}`
        const errorDetails = errorData.details ? ` - ${errorData.details}` : ''

        throw new Error(errorMessage + errorDetails)
      }
    } catch (error) {
      console.error('Error fetching driver performance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch driver performance'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 95) return 'text-green-600'
    if (score >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    switch (sortBy) {
      case 'trips':
        return b.totalTrips - a.totalTrips
      case 'onTime':
        return b.onTimePercentage - a.onTimePercentage
      case 'completed':
        return b.completedTrips - a.completedTrips
      default:
        return b.totalTrips - a.totalTrips
    }
  })

  const avgOnTime = drivers.length > 0
    ? Math.round(drivers.reduce((sum, driver) => sum + driver.onTimePercentage, 0) / drivers.length)
    : 0
  const totalTrips = drivers.reduce((sum, driver) => sum + driver.totalTrips, 0)
  const totalCompleted = drivers.reduce((sum, driver) => sum + driver.completedTrips, 0)
  const completionRate = totalTrips > 0 ? Math.round((totalCompleted / totalTrips) * 100) : 0

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading driver performance...</p>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchDriverPerformance}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['transport_company']}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2" />
            Driver Performance
          </h1>
          <p className="text-gray-600">Monitor and analyze driver performance metrics</p>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                  <p className="text-2xl font-bold text-blue-600">{drivers.length}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg On-Time %</p>
                  <p className="text-2xl font-bold text-green-600">{avgOnTime}%</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Trips</p>
                  <p className="text-2xl font-bold text-purple-600">{totalTrips}</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-yellow-600">{completionRate}%</p>
                </div>
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by driver name or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trips">Total Trips</SelectItem>
                    <SelectItem value="completed">Completed Trips</SelectItem>
                    <SelectItem value="onTime">On-Time %</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance List */}
        <div className="space-y-4">
          {sortedDrivers.map((driver, index) => (
            <Card key={driver.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                          <p className="text-sm text-gray-500">{driver.employeeId}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(driver.trend)}
                        <span className={`text-sm font-medium ${getTrendColor(driver.trend)}`}>
                          {driver.trend === 'up' ? 'Improving' : driver.trend === 'down' ? 'Declining' : 'Stable'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{driver.totalTrips}</div>
                        <p className="text-xs text-gray-500">Total Trips</p>
                        <p className="text-xs text-gray-400">({driver.lastMonth.trips} last month)</p>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{driver.completedTrips}</div>
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="text-xs text-gray-400">
                          {driver.totalTrips > 0 ? Math.round((driver.completedTrips / driver.totalTrips) * 100) : 0}% rate
                        </p>
                      </div>

                      <div className="text-center">
                        <div className={`text-lg font-semibold ${getPerformanceColor(driver.onTimePercentage)}`}>
                          {driver.onTimePercentage}%
                        </div>
                        <p className="text-xs text-gray-500">On-Time</p>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold">{driver.avgResponseTime}</div>
                        <p className="text-xs text-gray-500">Avg Response</p>
                      </div>

                      <div className="text-center">
                        <Badge className={
                          driver.status === 'available' ? 'bg-green-100 text-green-800' :
                          driver.status === 'on_trip' ? 'bg-blue-100 text-blue-800' :
                          driver.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {driver.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">Status</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Email: </span>
                          <span className="font-medium">{driver.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone: </span>
                          <span className="font-medium">{driver.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Verified: </span>
                          <span className="font-medium">
                            {driver.isVerified ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedDrivers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No drivers found</h3>
                <p>Try adjusting your search criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  )
}
