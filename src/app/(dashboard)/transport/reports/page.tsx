'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Truck,
  Users,
  Star,
  Download,
  Calendar,
  RefreshCw,
  PieChart,
  Activity,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { toast } from 'sonner'

interface ReportData {
  overview: {
    total_requests: number
    completed_requests: number
    completion_rate: number
    avg_response_time: number
    active_drivers: number
    total_drivers: number
    driver_utilization: number
  }
  time_series: Array<{
    date: string
    requests: number
    completed: number
    response_time: number
  }>
  driver_performance: Array<{
    id: string
    name: string
    total_trips: number
    completed_trips: number
    avg_response_time: number
    rating: string
    status: string
  }>
  fleet_utilization: Array<{
    vehicle_type: string
    total: number
    active: number
    utilization: number
  }>
  revenue: {
    total_revenue: number
    monthly_growth: number
    avg_trip_value: number
    top_revenue_drivers: Array<{
      id: string
      name: string
      total_trips: number
      revenue: number
    }>
  }
  period: string
}

export default function TransportReportsPage() {
  const [timeRange, setTimeRange] = useState('month')
  const [reportType, setReportType] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [timeRange])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('period', timeRange)

      const response = await fetch(`/api/transport/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReportData(data.reports)
        } else {
          throw new Error(data.error || 'Failed to fetch reports')
        }
      } else {
        throw new Error('Failed to fetch reports')
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch reports')
      toast.error('Failed to fetch performance reports')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchReports()
    setRefreshing(false)
  }

  // Calculate performance metrics from real data
  const performanceMetrics = reportData ? [
    {
      title: 'Total Revenue',
      value: `$${reportData.revenue.total_revenue.toLocaleString()}`,
      change: `${reportData.revenue.monthly_growth >= 0 ? '+' : ''}${reportData.revenue.monthly_growth}%`,
      trend: reportData.revenue.monthly_growth >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Completed Trips',
      value: reportData.overview.completed_requests.toLocaleString(),
      change: `${reportData.overview.completion_rate}% completion`,
      trend: reportData.overview.completion_rate >= 80 ? 'up' : 'down',
      icon: Truck,
      color: 'text-blue-600'
    },
    {
      title: 'Average Response Time',
      value: `${reportData.overview.avg_response_time} min`,
      change: reportData.overview.avg_response_time <= 10 ? 'Good' : 'Needs improvement',
      trend: reportData.overview.avg_response_time <= 10 ? 'up' : 'down',
      icon: Clock,
      color: 'text-purple-600'
    },
    {
      title: 'Driver Utilization',
      value: `${reportData.overview.driver_utilization}%`,
      change: `${reportData.overview.active_drivers}/${reportData.overview.total_drivers} active`,
      trend: reportData.overview.driver_utilization >= 50 ? 'up' : 'down',
      icon: Users,
      color: 'text-yellow-600'
    }
  ] : []

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />
  }

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading performance reports...</p>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchReports}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (!reportData) {
    return (
      <RoleGuard allowedRoles={['transport_company']}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No report data available</p>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['transport_company']}>
      <div className="p-6 space-y-6">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2" />
            Performance Reports
          </h1>
          <p className="text-gray-600">Comprehensive performance analytics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm ml-1 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Performance
            </CardTitle>
            <CardDescription>Revenue and trip trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Monthly performance chart would be rendered here</p>
                <p className="text-sm">Integration with charting library required</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Revenue Distribution
            </CardTitle>
            <CardDescription>Revenue breakdown by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-2" />
                <p>Revenue distribution chart would be rendered here</p>
                <p className="text-sm">Integration with charting library required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Drivers</CardTitle>
          <CardDescription>Driver performance metrics for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData && reportData.revenue.top_revenue_drivers.length > 0 ? (
            <div className="space-y-4">
              {reportData.revenue.top_revenue_drivers.map((driver, index) => (
                <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{driver.name}</h3>
                      <p className="text-sm text-gray-500">Driver</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{driver.total_trips}</div>
                      <div className="text-xs text-gray-500">Trips</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">${driver.revenue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No driver performance data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fleet Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Utilization</CardTitle>
          <CardDescription>Driver status distribution and utilization rates</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData && reportData.fleet_utilization.length > 0 ? (
            <div className="space-y-4">
              {reportData.fleet_utilization.map((fleet, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Activity className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{fleet.vehicle_type}</h3>
                      <p className="text-sm text-gray-500">Status</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{fleet.utilization}%</div>
                      <div className="text-xs text-gray-500">Percentage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{fleet.active}/{fleet.total}</div>
                      <div className="text-xs text-gray-500">Drivers</div>
                    </div>
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${fleet.utilization}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No fleet utilization data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key insights and recommendations based on current data</CardDescription>
        </CardHeader>
        <CardContent>
          {reportData ? (
            <div className="space-y-4">
              {/* Revenue Growth Insight */}
              {reportData.revenue.monthly_growth !== 0 && (
                <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                  reportData.revenue.monthly_growth > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {reportData.revenue.monthly_growth > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      reportData.revenue.monthly_growth > 0 ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Revenue {reportData.revenue.monthly_growth > 0 ? 'Growth' : 'Decline'}
                    </p>
                    <p className={`text-sm ${
                      reportData.revenue.monthly_growth > 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Revenue has {reportData.revenue.monthly_growth > 0 ? 'increased' : 'decreased'} by {Math.abs(reportData.revenue.monthly_growth)}% compared to the previous period.
                      {reportData.revenue.monthly_growth > 0
                        ? ' Keep up the great work!'
                        : ' Consider reviewing driver performance and response times.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Driver Utilization Insight */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                reportData.overview.driver_utilization >= 50 ? 'bg-blue-50' : 'bg-yellow-50'
              }`}>
                <Activity className={`h-5 w-5 mt-0.5 ${
                  reportData.overview.driver_utilization >= 50 ? 'text-blue-600' : 'text-yellow-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    reportData.overview.driver_utilization >= 50 ? 'text-blue-800' : 'text-yellow-800'
                  }`}>
                    Driver Utilization
                  </p>
                  <p className={`text-sm ${
                    reportData.overview.driver_utilization >= 50 ? 'text-blue-700' : 'text-yellow-700'
                  }`}>
                    {reportData.overview.driver_utilization}% of your drivers are currently active ({reportData.overview.active_drivers}/{reportData.overview.total_drivers}).
                    {reportData.overview.driver_utilization >= 70
                      ? ' Consider adding more drivers to handle peak demand.'
                      : reportData.overview.driver_utilization >= 50
                      ? ' Utilization is at a healthy level.'
                      : ' Low utilization detected. Review driver assignments and availability.'}
                  </p>
                </div>
              </div>

              {/* Response Time Insight */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                reportData.overview.avg_response_time <= 10 ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <Clock className={`h-5 w-5 mt-0.5 ${
                  reportData.overview.avg_response_time <= 10 ? 'text-green-600' : 'text-yellow-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    reportData.overview.avg_response_time <= 10 ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    Response Time Performance
                  </p>
                  <p className={`text-sm ${
                    reportData.overview.avg_response_time <= 10 ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    Average response time is {reportData.overview.avg_response_time} minutes.
                    {reportData.overview.avg_response_time <= 10
                      ? ' Excellent response time! Keep maintaining this standard.'
                      : ' Consider optimizing driver locations and assignment algorithms to improve response times.'}
                  </p>
                </div>
              </div>

              {/* Completion Rate Insight */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                reportData.overview.completion_rate >= 80 ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <Truck className={`h-5 w-5 mt-0.5 ${
                  reportData.overview.completion_rate >= 80 ? 'text-green-600' : 'text-yellow-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    reportData.overview.completion_rate >= 80 ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    Trip Completion Rate
                  </p>
                  <p className={`text-sm ${
                    reportData.overview.completion_rate >= 80 ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {reportData.overview.completion_rate}% of trips are being completed successfully ({reportData.overview.completed_requests}/{reportData.overview.total_requests}).
                    {reportData.overview.completion_rate >= 80
                      ? ' Great job maintaining high completion rates!'
                      : ' Review incomplete trips to identify and address issues.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No insights available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
    </RoleGuard>
  )
}
