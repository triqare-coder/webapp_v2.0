'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockDashboardStats, mockSOSCases } from '@/lib/mock-data'
import { formatDateTime, getSeverityColor, getStatusColor } from '@/lib/utils'
import {
  Users,
  Building2,
  Truck,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react'

export function AdminDashboard() {
  const stats = mockDashboardStats
  const recentCases = mockSOSCases.slice(0, 5)

  const statCards = [
    {
      title: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active Cases',
      value: stats.activeCases,
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      title: 'Available Ambulances',
      value: stats.availableAmbulances,
      icon: Truck,
      color: 'text-green-600'
    },
    {
      title: 'Avg Response Time',
      value: `${stats.averageResponseTime}m`,
      icon: Clock,
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of emergency response system</p>
        </div>
        <Button>
          <AlertTriangle className="h-4 w-4 mr-2" />
          New Emergency
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Hospitals</span>
              <span className="font-semibold">{stats.totalHospitals}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Ambulances</span>
              <span className="font-semibold">{stats.totalAmbulances}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Drivers</span>
              <span className="font-semibold">{stats.totalDrivers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed Cases</span>
              <span className="font-semibold">{stats.completedCases}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Recent Emergency Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCases.map((case_) => (
                <div key={case_.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {case_.patient.firstName} {case_.patient.lastName}
                      </span>
                      <Badge className={getSeverityColor(case_.severity)}>
                        {case_.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{case_.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(case_.createdAt)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(case_.status)}>
                    {case_.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Patient</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Building2 className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Hospital</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Truck className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Ambulance</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <UserCheck className="h-6 w-6 mb-2" />
              <span className="text-sm">Add Driver</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
