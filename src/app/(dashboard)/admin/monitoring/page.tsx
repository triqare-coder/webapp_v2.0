'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Truck,
  Building2,
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'

export default function AdminMonitoringPage() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const systemComponents = [
    {
      name: 'Web Server',
      status: 'healthy',
      uptime: '99.9%',
      responseTime: '45ms',
      icon: Server,
      details: 'All endpoints responding normally'
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: '99.8%',
      responseTime: '12ms',
      icon: Database,
      details: 'Connection pool optimal'
    },
    {
      name: 'API Gateway',
      status: 'warning',
      uptime: '98.5%',
      responseTime: '120ms',
      icon: Wifi,
      details: 'Elevated response times detected'
    },
    {
      name: 'Authentication Service',
      status: 'healthy',
      uptime: '99.9%',
      responseTime: '35ms',
      icon: Users,
      details: 'All authentication flows working'
    }
  ]

  const liveMetrics = [
    { label: 'Active Users', value: '247', change: '+12', icon: Users },
    { label: 'Active Vehicles', value: '45', change: '+2', icon: Truck },
    { label: 'Connected Hospitals', value: '28', change: '0', icon: Building2 },
    { label: 'System Load', value: '67%', change: '+5%', icon: Activity }
  ]

  const recentAlerts = [
    {
      id: '1',
      type: 'warning',
      message: 'API response time elevated',
      timestamp: '2 minutes ago',
      component: 'API Gateway'
    },
    {
      id: '2',
      type: 'info',
      message: 'Database backup completed',
      timestamp: '15 minutes ago',
      component: 'Database'
    },
    {
      id: '3',
      type: 'success',
      message: 'System health check passed',
      timestamp: '30 minutes ago',
      component: 'Health Monitor'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="h-6 w-6 mr-2" />
            System Monitoring
          </h1>
          <p className="text-gray-600">Real-time system health and performance monitoring</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {liveMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm text-gray-500">
                    {metric.change.startsWith('+') ? '↗' : metric.change.startsWith('-') ? '↘' : '→'} {metric.change}
                  </p>
                </div>
                <metric.icon className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Components */}
      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
          <CardDescription>Health status of core system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemComponents.map((component, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <component.icon className="h-8 w-8 text-gray-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{component.name}</h3>
                    <p className="text-sm text-gray-500">{component.details}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Uptime: {component.uptime}
                    </div>
                    <div className="text-sm text-gray-500">
                      Response: {component.responseTime}
                    </div>
                  </div>
                  <Badge className={getStatusColor(component.status)}>
                    {getStatusIcon(component.status)}
                    <span className="ml-1 capitalize">{component.status}</span>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>Latest system alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge className={getAlertColor(alert.type)}>
                    {alert.type}
                  </Badge>
                  <div>
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-500">{alert.component}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {alert.timestamp}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>CPU, Memory, and Network usage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2" />
                <p>Performance chart would be rendered here</p>
                <p className="text-sm">Integration with monitoring service required</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>API endpoint response times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2" />
                <p>Response time chart would be rendered here</p>
                <p className="text-sm">Integration with APM tool required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
