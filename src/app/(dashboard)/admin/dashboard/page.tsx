'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { DownloadAppButton } from '@/components/DownloadAppButton'
import {
  Users,
  Building2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  Shield,
  Database,
  Settings,
  BarChart3,
  UserCheck
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminDashboardStats {
  totalUsers: number
  totalHospitals: number
  activeEmergencies: number
  totalDrivers: number
  systemUptime: string
  avgResponseTime: string
  systemAlerts: Array<{
    id: number
    type: string
    message: string
    timestamp: string
    severity: string
  }>
  roleDistribution: Record<string, number>
  recentActivity: {
    newSOS: number
    newUsers: number
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard/stats')
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
      console.error('Error fetching dashboard stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Mock recent activities for now - would be replaced with real API
  const recentActivities = [
    {
      id: 1,
      action: 'System Status',
      details: `${stats?.recentActivity.newUsers || 0} new users registered today`,
      timestamp: 'Today',
      type: 'user'
    },
    {
      id: 2,
      action: 'Emergency Activity',
      details: `${stats?.recentActivity.newSOS || 0} new SOS requests in last 24 hours`,
      timestamp: 'Last 24 hours',
      type: 'emergency'
    },
    {
      id: 3,
      action: 'System Health',
      details: `System uptime: ${stats?.systemUptime || 'N/A'}`,
      timestamp: 'Current',
      type: 'system'
    }
  ]

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin']}>
        <div className="p-6 space-y-6">
          <LoadingSkeleton />
        </div>
      </RoleGuard>
    )
  }

  if (error || !stats) {
    return (
      <RoleGuard allowedRoles={['admin']}>
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
    <RoleGuard allowedRoles={['admin']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🛡️ Admin Dashboard
            </h1>
            <p className="text-gray-600">
              System overview and administrative controls
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <DownloadAppButton />
            <Badge className="bg-red-100 text-red-800">
              <Shield className="h-3 w-3 mr-1" />
              System Administrator
            </Badge>
          </div>
        </div>



        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentActivity.newUsers} new today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hospitals</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHospitals}</div>
              <p className="text-xs text-muted-foreground">
                Across the network
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Emergencies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.activeEmergencies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeEmergencies > 0 ? 'Requires attention' : 'All clear'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.systemUptime}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">
                Recent average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDrivers}</div>
              <p className="text-xs text-muted-foreground">
                Registered drivers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.systemAlerts.length}</div>
              <p className="text-xs text-muted-foreground">
                {stats.systemAlerts.length === 0 ? 'All systems operational' : 'Active alerts'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Alerts */}
        {stats.systemAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.systemAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center space-x-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex-shrink-0">
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'high' ? 'text-red-500' :
                        alert.severity === 'medium' ? 'text-orange-500' :
                        'text-blue-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{alert.type.toUpperCase()}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500">{alert.timestamp}</p>
                    </div>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.type === 'user' && <Users className="h-5 w-5 text-blue-500" />}
                    {activity.type === 'system' && <Settings className="h-5 w-5 text-gray-500" />}
                    {activity.type === 'emergency' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.details}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        {Object.keys(stats.roleDistribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(stats.roleDistribution).map(([role, count]) => (
                  <div key={role} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{role.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Administrative Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/users">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Users className="h-6 w-6 mb-2" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/hospitals">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Building2 className="h-6 w-6 mb-2" />
                  Hospital Settings
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  System Reports
                </Button>
              </Link>
              <Link href="/admin/transport-companies">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Database className="h-6 w-6 mb-2" />
                  Data Management
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
