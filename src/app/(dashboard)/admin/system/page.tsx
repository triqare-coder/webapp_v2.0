'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Building2, 
  Truck, 
  Users, 
  UserCheck, 
  Activity,
  Database,
  Shield,
  Bell,
  Globe,
  Server,
  HardDrive,
  Wifi,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function SystemManagementPage() {
  const systemModules = [
    {
      title: 'Hospital Management',
      description: 'Manage hospital network, capacity, and services',
      icon: Building2,
      href: '/admin/hospitals',
      count: 45,
      status: 'active',
      color: 'bg-blue-100 text-blue-800'
    },

    {
      title: 'Patient Records',
      description: 'Manage patient database and medical records',
      icon: Users,
      href: '/admin/patients',
      count: 2847,
      status: 'active',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      title: 'Driver Management',
      description: 'Manage driver certifications and assignments',
      icon: UserCheck,
      href: '/admin/drivers',
      count: 156,
      status: 'active',
      color: 'bg-orange-100 text-orange-800'
    }
  ]

  const systemStats = [
    {
      title: 'System Uptime',
      value: '99.9%',
      description: 'Last 30 days',
      icon: Activity,
      color: 'text-green-600'
    },
    {
      title: 'Database Size',
      value: '2.4 GB',
      description: 'Total storage used',
      icon: Database,
      color: 'text-blue-600'
    },
    {
      title: 'Active Sessions',
      value: '47',
      description: 'Current users online',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'API Calls',
      value: '12.5K',
      description: 'Today',
      icon: Server,
      color: 'text-orange-600'
    }
  ]

  const systemHealth = [
    {
      component: 'Web Server',
      status: 'healthy',
      uptime: '99.9%',
      lastCheck: '2 minutes ago'
    },
    {
      component: 'Database',
      status: 'healthy',
      uptime: '99.8%',
      lastCheck: '1 minute ago'
    },
    {
      component: 'Authentication Service',
      status: 'healthy',
      uptime: '100%',
      lastCheck: '30 seconds ago'
    },
    {
      component: 'Notification Service',
      status: 'warning',
      uptime: '98.5%',
      lastCheck: '5 minutes ago'
    },
    {
      component: 'File Storage',
      status: 'healthy',
      uptime: '99.7%',
      lastCheck: '1 minute ago'
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

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
          <p className="text-gray-600">Monitor and manage system components and configurations</p>
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systemStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Modules
            </CardTitle>
            <CardDescription>Manage core system components and data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemModules.map((module, index) => (
                <Link key={index} href={module.href}>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <module.icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{module.title}</h3>
                          <p className="text-sm text-gray-500">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={module.color}>
                          {module.count.toLocaleString()}
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

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
            <CardDescription>Real-time status of system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((component, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        component.status === 'healthy' ? 'bg-green-500' :
                        component.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">{component.component}</span>
                    </div>
                    <Badge className={getStatusColor(component.status)}>
                      {component.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{component.uptime} uptime</div>
                    <div className="text-xs text-gray-500">Last check: {component.lastCheck}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                SSL Certificate Status
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Security Audit Log
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Active Sessions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <HardDrive className="h-4 w-4 mr-2" />
                Backup Status
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                Performance Metrics
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Maintenance Mode
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                System Alerts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Wifi className="h-4 w-4 mr-2" />
                API Status
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Server className="h-4 w-4 mr-2" />
                Server Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
