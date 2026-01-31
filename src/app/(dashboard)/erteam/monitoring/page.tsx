'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Map, 
  MapPin, 
  Truck, 
  UserCheck, 
  Activity,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function MonitoringPage() {
  const monitoringModules = [
    {
      title: 'Live Map View',
      description: 'Real-time location tracking of all ambulances and emergency units',
      icon: Map,
      href: '/erteam/map',
      status: 'active',
      count: '12 units online',
      color: 'bg-blue-100 text-blue-800',
      priority: 'high'
    },

    {
      title: 'Driver Status',
      description: 'Track driver availability, shift status, and performance metrics',
      icon: UserCheck,
      href: '/erteam/drivers',
      status: 'active',
      count: '15 on duty',
      color: 'bg-purple-100 text-purple-800',
      priority: 'medium'
    }
  ]

  const liveStats = [
    {
      title: 'Active Units',
      value: '12',
      description: 'Currently deployed',
      icon: Truck,
      color: 'text-blue-600',
      trend: '+2 from yesterday'
    },
    {
      title: 'Response Time',
      value: '8.5 min',
      description: 'Average today',
      icon: Clock,
      color: 'text-green-600',
      trend: '-1.2 min improvement'
    },
    {
      title: 'Coverage Area',
      value: '98.5%',
      description: 'City coverage',
      icon: MapPin,
      color: 'text-purple-600',
      trend: '+0.3% increase'
    },
    {
      title: 'System Health',
      value: '99.9%',
      description: 'Uptime',
      icon: Activity,
      color: 'text-orange-600',
      trend: 'Excellent'
    }
  ]

  const recentAlerts = [
    {
      id: '1',
      type: 'warning',
      message: 'AMB-003 low fuel - recommend refueling',
      time: '2 minutes ago',
      location: 'Downtown District'
    },
    {
      id: '2',
      type: 'info',
      message: 'Driver shift change completed - AMB-007',
      time: '15 minutes ago',
      location: 'Midtown Station'
    },
    {
      id: '3',
      type: 'success',
      message: 'AMB-001 completed emergency response',
      time: '23 minutes ago',
      location: 'Uptown Area'
    },
    {
      id: '4',
      type: 'warning',
      message: 'High traffic detected on Route 45',
      time: '35 minutes ago',
      location: 'Highway Corridor'
    }
  ]

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'info':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'info':
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="h-6 w-6 mr-2" />
            Live Monitoring Center
          </h1>
          <p className="text-gray-600">Real-time monitoring and tracking of emergency response operations</p>
        </div>

        {/* Live Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {liveStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monitoring Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Navigation className="h-5 w-5 mr-2" />
              Monitoring Modules
            </CardTitle>
            <CardDescription>Access real-time tracking and monitoring tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {monitoringModules.map((module, index) => (
                <Link key={index} href={module.href}>
                  <div className="p-6 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer h-full">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <module.icon className="h-6 w-6 text-gray-600" />
                        </div>
                        <Badge className={module.color}>
                          {module.count}
                        </Badge>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {module.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Recent System Alerts
            </CardTitle>
            <CardDescription>Latest notifications and system updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Badge className={getAlertColor(alert.type)}>
                    {getAlertIcon(alert.type)}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {alert.time}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {alert.location}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Map className="h-5 w-5 mr-2" />
                Map Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                Center on Active Units
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Navigation className="h-4 w-4 mr-2" />
                Show Traffic Overlay
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Highlight Emergency Zones
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                System Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Truck className="h-4 w-4 mr-2" />
                Dispatch Emergency Unit
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <UserCheck className="h-4 w-4 mr-2" />
                Contact Driver
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Broadcast
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">Online</div>
                <div className="text-sm text-gray-500">GPS Tracking</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">Active</div>
                <div className="text-sm text-gray-500">Communication</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">Operational</div>
                <div className="text-sm text-gray-500">Emergency Dispatch</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
