'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  Truck,
  Building2,
  CreditCard,
  TrendingUp,
  Clock,
  UserPlus,
  Shield,
  DollarSign,
  Calendar,
  Ambulance,
  Gauge,
  BarChart3,
  PieChart
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts'
import dynamic from 'next/dynamic'

// Dynamic imports for D3 charts (client-side only)
const D3GaugeChart = dynamic(() => import('@/components/charts/D3GaugeChart'), { ssr: false })
const D3HeatmapChart = dynamic(() => import('@/components/charts/D3HeatmapChart'), { ssr: false })
const D3RadialChart = dynamic(() => import('@/components/charts/D3RadialChart'), { ssr: false })
const D3ProgressRing = dynamic(() => import('@/components/charts/D3ProgressRing'), { ssr: false })
const D3TreemapChart = dynamic(() => import('@/components/charts/D3TreemapChart'), { ssr: false })

// Color schemes for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6']

interface AnalyticsData {
  usersByRole: Record<string, number>
  totalUsers: number
  sosStatistics: {
    total: number
    active: number
    completed: number
    cancelled: number
    byStatus: Record<string, number>
    avgResponseTime: string
    todayCount: number
  }
  recentActivity: {
    newUsersThisWeek: number
    sosRequestsThisWeek: number
    newUsersToday: number
    sosRequestsToday: number
  }
  userActivityTrends: Array<{ date: string; newUsers: number; sosRequests: number }>
  driverStats: {
    total: number
    available: number
    busy: number
    offline: number
    verified: number
    unverified: number
    newThisWeek: number
  }
  hospitalStats: {
    total: number
    active: number
    inactive: number
    newThisMonth: number
  }
  transportStats: {
    total: number
    verified: number
    unverified: number
    newThisMonth: number
  }
  patientStats: {
    total: number
    newThisWeek: number
    newThisMonth: number
  }
  subscriptionStats: {
    total: number
    active: number
    expired: number
    cancelled: number
  }
  revenueStats: {
    totalRevenue: number
    thisMonthRevenue: number
    transactionCount: number
  }
  recentUsers: Array<{ id: string; name: string; email: string; role: string; joinedAt: string }>
  recentSOS: Array<{ id: string; status: string; requestedAt: string; autoAssigned: boolean }>
  sosHeatmap?: Array<{ day: number; hour: number; value: number }>
  hourlyActivity?: Array<{ hour: number; sosCount: number; userCount: number }>
  weeklyPattern?: Array<{ day: string; sosCount: number; avgResponseTime: number }>
  systemHealth?: {
    driverAvailability: number
    hospitalCapacity: number
    sosCompletionRate: number
    subscriptionHealth: number
  }
  driverFleetStats?: {
    total: number
    available: number
    assigned: number
    onTrip: number
    inactive: number
    verified: number
    unverified: number
  }
}

export default function AnalyticsPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      console.log('Fetching analytics data...')
      
      const response = await fetch(`/api/admin/analytics/comprehensive`)
      console.log('Analytics API response status:', response.status)
      
      const result = await response.json()
      console.log('Analytics API response:', result)

      if (result.success) {
        setAnalyticsData(result.data)
        console.log('Analytics data loaded successfully')
      } else {
        console.error('Failed to load analytics data:', result.error || 'Unknown error')
        console.error('Full response:', result)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const prepareUserRoleChart = () => {
    if (!analyticsData?.usersByRole) return []
    return Object.entries(analyticsData.usersByRole).map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
      value: count as number
    }))
  }

  const prepareSOSStatusChart = () => {
    if (!analyticsData?.sosStatistics.byStatus) return []
    return Object.entries(analyticsData.sosStatistics.byStatus).map(([status, count]) => ({
      name: status,
      value: count as number
    }))
  }

  // SOS by Status chart (severity doesn't exist in schema)
  const prepareSOSByStatusChart = () => {
    if (!analyticsData?.sosStatistics.byStatus) return []
    const statusColors: Record<string, string> = {
      'SOS Triggered': '#EF4444',
      'Driver Assigned': '#F97316',
      'Driver En Route': '#F59E0B',
      'Patient Picked Up': '#3B82F6',
      'At Hospital': '#8B5CF6',
      'Completed': '#10B981',
      'Cancelled': '#6B7280',
      'Transferred': '#06B6D4'
    }
    return Object.entries(analyticsData.sosStatistics.byStatus).map(([status, count]) => ({
      name: status,
      value: count as number,
      fill: statusColors[status] || '#6B7280'
    }))
  }

  const prepareDriverStatusChart = () => {
    if (!analyticsData?.driverStats) return []
    return [
      { name: 'Available', value: analyticsData.driverStats.available, fill: '#10B981' },
      { name: 'Busy', value: analyticsData.driverStats.busy, fill: '#F59E0B' },
      { name: 'Offline', value: analyticsData.driverStats.offline, fill: '#6B7280' }
    ]
  }

  const prepareSubscriptionChart = () => {
    if (!analyticsData?.subscriptionStats) return []
    return [
      { name: 'Active', value: analyticsData.subscriptionStats.active, fill: '#10B981' },
      { name: 'Expired', value: analyticsData.subscriptionStats.expired, fill: '#EF4444' },
      { name: 'Cancelled', value: analyticsData.subscriptionStats.cancelled, fill: '#6B7280' }
    ]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'SOS Triggered': 'bg-red-100 text-red-800',
      'Driver Assigned': 'bg-blue-100 text-blue-800',
      'Driver En Route': 'bg-yellow-100 text-yellow-800',
      'Patient Picked Up': 'bg-purple-100 text-purple-800',
      'At Hospital': 'bg-indigo-100 text-indigo-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      patient: 'bg-blue-100 text-blue-800',
      driver: 'bg-green-100 text-green-800',
      erteam: 'bg-orange-100 text-orange-800',
      hospital_admin: 'bg-red-100 text-red-800',
      transport_company: 'bg-cyan-100 text-cyan-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive monitoring of user activities and system performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalUsers || 0}</div>
            <p className="text-xs text-green-600">+{analyticsData?.recentActivity.newUsersToday || 0} today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Patients</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.patientStats?.total || 0}</div>
            <p className="text-xs text-green-600">+{analyticsData?.patientStats?.newThisWeek || 0} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Drivers</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.driverStats?.total || 0}</div>
            <p className="text-xs text-green-600">{analyticsData?.driverStats?.available || 0} available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.hospitalStats?.total || 0}</div>
            <p className="text-xs text-green-600">{analyticsData?.hospitalStats?.active || 0} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">SOS Total</CardTitle>
            <Phone className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.sosStatistics?.total || 0}</div>
            <p className="text-xs text-green-600">+{analyticsData?.sosStatistics?.todayCount || 0} today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Active SOS</CardTitle>
            <Activity className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analyticsData?.sosStatistics?.active || 0}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.sosStatistics?.avgResponseTime || '0'}m</div>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatCurrency(analyticsData?.revenueStats?.thisMonthRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Fleet Statistics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Drivers</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.driverFleetStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Fleet size</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analyticsData?.driverFleetStats?.available || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Assigned</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analyticsData?.driverFleetStats?.assigned || 0}</div>
            <p className="text-xs text-muted-foreground">Waiting for pickup</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">On Trip</CardTitle>
            <Ambulance className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analyticsData?.driverFleetStats?.onTrip || 0}</div>
            <p className="text-xs text-muted-foreground">Currently driving</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Inactive</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{analyticsData?.driverFleetStats?.inactive || 0}</div>
            <p className="text-xs text-muted-foreground">Off duty</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Verified</CardTitle>
            <Shield className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{analyticsData?.driverFleetStats?.verified || 0}</div>
            <p className="text-xs text-muted-foreground">of {analyticsData?.driverFleetStats?.total || 0} drivers</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Activity Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Activity Trends (Last 30 Days)
              </CardTitle>
              <CardDescription>New users and SOS requests over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData?.userActivityTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(value) => value.slice(5)} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="newUsers" stroke="#3B82F6" strokeWidth={2} name="New Users" />
                  <Line type="monotone" dataKey="sosRequests" stroke="#EF4444" strokeWidth={2} name="SOS Requests" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
                <CardDescription>Distribution of users across different roles</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie data={prepareUserRoleChart()} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {prepareUserRoleChart().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SOS by Status</CardTitle>
                <CardDescription>Current status distribution of SOS requests</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie data={prepareSOSStatusChart()} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {prepareSOSStatusChart().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab - D3 Charts */}
        <TabsContent value="insights" className="space-y-4">
          {/* System Health Gauges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                System Health Metrics
              </CardTitle>
              <CardDescription>Real-time health indicators for key system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
                <div className="text-center">
                  <D3GaugeChart
                    value={analyticsData?.systemHealth?.driverAvailability || 0}
                    label="Driver Availability"
                    colors={['#EF4444', '#F59E0B', '#10B981']}
                  />
                </div>
                <div className="text-center">
                  <D3GaugeChart
                    value={analyticsData?.systemHealth?.hospitalCapacity || 0}
                    label="Hospital Capacity"
                    colors={['#EF4444', '#F59E0B', '#10B981']}
                  />
                </div>
                <div className="text-center">
                  <D3GaugeChart
                    value={analyticsData?.systemHealth?.sosCompletionRate || 0}
                    label="SOS Completion"
                    colors={['#EF4444', '#F59E0B', '#10B981']}
                  />
                </div>
                <div className="text-center">
                  <D3GaugeChart
                    value={analyticsData?.systemHealth?.subscriptionHealth || 0}
                    label="Subscription Health"
                    colors={['#EF4444', '#F59E0B', '#10B981']}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SOS Activity Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                SOS Activity Heatmap
              </CardTitle>
              <CardDescription>SOS request distribution by day of week and hour</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center overflow-x-auto">
              <D3HeatmapChart
                data={analyticsData?.sosHeatmap || []}
                width={700}
                height={250}
                title=""
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radial Bar - Users by Role */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Users Distribution
                </CardTitle>
                <CardDescription>Interactive radial view of user distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <D3RadialChart
                  data={Object.entries(analyticsData?.usersByRole || {}).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
                    value: value as number
                  }))}
                  width={300}
                  height={300}
                  title="Total"
                />
              </CardContent>
            </Card>

            {/* Treemap - Entity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Entity Distribution
                </CardTitle>
                <CardDescription>System entities at a glance</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <D3TreemapChart
                  data={[
                    { name: 'Users', value: analyticsData?.totalUsers || 0, color: '#3B82F6' },
                    { name: 'Patients', value: analyticsData?.patientStats?.total || 0, color: '#10B981' },
                    { name: 'Drivers', value: analyticsData?.driverStats?.total || 0, color: '#F59E0B' },
                    { name: 'Hospitals', value: analyticsData?.hospitalStats?.total || 0, color: '#EF4444' },
                    { name: 'Transport Co.', value: analyticsData?.transportStats?.total || 0, color: '#8B5CF6' },
                    { name: 'Subscriptions', value: analyticsData?.subscriptionStats?.total || 0, color: '#06B6D4' }
                  ]}
                  width={400}
                  height={250}
                  title="System Entities"
                />
              </CardContent>
            </Card>
          </div>

          {/* Weekly Pattern Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly SOS Pattern
              </CardTitle>
              <CardDescription>SOS requests and average response time by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData?.weeklyPattern || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="sosCount" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="SOS Count" />
                  <Area yAxisId="right" type="monotone" dataKey="avgResponseTime" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Avg Response (min)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Activity Distribution
              </CardTitle>
              <CardDescription>Peak hours for SOS requests and user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData?.hourlyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}:00`} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => `${v}:00`} />
                  <Legend />
                  <Bar dataKey="sosCount" fill="#EF4444" name="SOS Requests" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="userCount" fill="#3B82F6" name="User Registrations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Progress Rings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SOS Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <D3ProgressRing
                  segments={[
                    { label: 'Active', value: analyticsData?.sosStatistics?.active || 0, color: '#F59E0B' },
                    { label: 'Done', value: analyticsData?.sosStatistics?.completed || 0, color: '#10B981' },
                    { label: 'Cancel', value: analyticsData?.sosStatistics?.cancelled || 0, color: '#EF4444' }
                  ]}
                  total={analyticsData?.sosStatistics?.total || 0}
                  centerText="Total SOS"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Driver Status</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <D3ProgressRing
                  segments={[
                    { label: 'Avail', value: analyticsData?.driverStats?.available || 0, color: '#10B981' },
                    { label: 'Busy', value: analyticsData?.driverStats?.busy || 0, color: '#F59E0B' },
                    { label: 'Offline', value: analyticsData?.driverStats?.offline || 0, color: '#6B7280' }
                  ]}
                  total={analyticsData?.driverStats?.total || 0}
                  centerText="Drivers"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Subscription Status</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <D3ProgressRing
                  segments={[
                    { label: 'Active', value: analyticsData?.subscriptionStats?.active || 0, color: '#10B981' },
                    { label: 'Expired', value: analyticsData?.subscriptionStats?.expired || 0, color: '#EF4444' },
                    { label: 'Cancel', value: analyticsData?.subscriptionStats?.cancelled || 0, color: '#6B7280' }
                  ]}
                  total={analyticsData?.subscriptionStats?.total || 0}
                  centerText="Subscriptions"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Driver Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{analyticsData?.driverStats?.verified || 0}</p>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{analyticsData?.driverStats?.unverified || 0}</p>
                    <p className="text-xs text-muted-foreground">Unverified</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Transport Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{analyticsData?.transportStats?.verified || 0}</p>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{analyticsData?.transportStats?.unverified || 0}</p>
                    <p className="text-xs text-muted-foreground">Unverified</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{analyticsData?.subscriptionStats?.active || 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600">{analyticsData?.subscriptionStats?.expired || 0}</p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatCurrency(analyticsData?.revenueStats?.totalRevenue || 0)}</p>
                <p className="text-xs text-muted-foreground">{analyticsData?.revenueStats?.transactionCount || 0} transactions</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Driver Status</CardTitle>
                <CardDescription>Current driver availability</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={prepareDriverStatusChart()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {prepareDriverStatusChart().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Patient subscription breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie data={prepareSubscriptionChart()} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {prepareSubscriptionChart().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Phone className="h-4 w-4" /> SOS Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">{analyticsData?.sosStatistics?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active</span>
                  <span className="font-bold text-yellow-600">{analyticsData?.sosStatistics?.active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Completed</span>
                  <span className="font-bold text-green-600">{analyticsData?.sosStatistics?.completed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cancelled</span>
                  <span className="font-bold text-red-600">{analyticsData?.sosStatistics?.cancelled || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Driver Fleet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total</span>
                  <span className="font-bold">{analyticsData?.driverFleetStats?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Available</span>
                  <span className="font-bold text-green-600">{analyticsData?.driverFleetStats?.available || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Assigned</span>
                  <span className="font-bold text-orange-600">{analyticsData?.driverFleetStats?.assigned || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">On Trip</span>
                  <span className="font-bold text-purple-600">{analyticsData?.driverFleetStats?.onTrip || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Inactive</span>
                  <span className="font-bold text-gray-600">{analyticsData?.driverFleetStats?.inactive || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Avg Response</span>
                  <span className="font-bold">{analyticsData?.sosStatistics?.avgResponseTime || '0'}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Completion Rate</span>
                  <span className="font-bold text-green-600">
                    {analyticsData?.sosStatistics?.total
                      ? ((analyticsData.sosStatistics.completed / analyticsData.sosStatistics.total) * 100).toFixed(1)
                      : '0'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Today&apos;s SOS</span>
                  <span className="font-bold">{analyticsData?.sosStatistics?.todayCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Hospitals</span>
                  <span className="font-bold">{analyticsData?.hospitalStats?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Transport Cos.</span>
                  <span className="font-bold">{analyticsData?.transportStats?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Drivers</span>
                  <span className="font-bold">{analyticsData?.driverStats?.total || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>SOS by Status</CardTitle>
                <CardDescription>Distribution of emergency requests by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={prepareSOSByStatusChart()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {prepareSOSByStatusChart().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" /> Driver Fleet Status
                </CardTitle>
                <CardDescription>Current driver fleet distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Available', value: analyticsData?.driverFleetStats?.available || 0, fill: '#10B981' },
                        { name: 'Assigned', value: analyticsData?.driverFleetStats?.assigned || 0, fill: '#F97316' },
                        { name: 'On Trip', value: analyticsData?.driverFleetStats?.onTrip || 0, fill: '#8B5CF6' },
                        { name: 'Inactive', value: analyticsData?.driverFleetStats?.inactive || 0, fill: '#6B7280' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                    >
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Count']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs">Available ({analyticsData?.driverFleetStats?.available || 0})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs">Assigned ({analyticsData?.driverFleetStats?.assigned || 0})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs">On Trip ({analyticsData?.driverFleetStats?.onTrip || 0})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="text-xs">Inactive ({analyticsData?.driverFleetStats?.inactive || 0})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" /> Recent User Registrations
                </CardTitle>
                <CardDescription>Latest 10 users who joined the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.recentUsers?.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(user.joinedAt)}</span>
                      </div>
                    </div>
                  ))}
                  {(!analyticsData?.recentUsers || analyticsData.recentUsers.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent users</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Recent SOS Requests
                </CardTitle>
                <CardDescription>Latest 10 emergency requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.recentSOS?.map((sos) => (
                    <div key={sos.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadgeColor(sos.status)}>{sos.status}</Badge>
                          {sos.autoAssigned && <Badge variant="outline" className="text-xs">Auto</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: <span className="font-mono text-xs">{sos.id.slice(0, 8)}...</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(sos.requestedAt)}</span>
                    </div>
                  ))}
                  {(!analyticsData?.recentSOS || analyticsData.recentSOS.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent SOS requests</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
