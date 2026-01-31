'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockAmbulances, mockDrivers, mockSOSCases } from '@/lib/mock-data'
import { formatDateTime, getStatusColor } from '@/lib/utils'
import {
  Truck,
  UserCheck,
  Phone,
  MapPin,
  Clock,
  Plus
} from 'lucide-react'

export function TransportDashboard() {
  // For demo, assume we're viewing company ID '1'
  const companyId = '1'
  const companyAmbulances = mockAmbulances.filter(a => a.transportCompanyId === companyId)
  const companyDrivers = mockDrivers.filter(d => d.transportCompanyId === companyId)
  const assignedCases = mockSOSCases.filter(c => 
    c.assignedAmbulanceId && companyAmbulances.some(a => a.id === c.assignedAmbulanceId)
  )

  const availableAmbulances = companyAmbulances.filter(a => a.status === 'available')
  const availableDrivers = companyDrivers.filter(d => d.status === 'available')
  const onDutyDrivers = companyDrivers.filter(d => d.status === 'on_duty')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transport Company Dashboard</h1>
          <p className="text-gray-600">Manage your driver assignments and transport operations</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Ambulances
            </CardTitle>
            <Truck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyAmbulances.length}</div>
            <p className="text-xs text-gray-600">{availableAmbulances.length} available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Drivers
            </CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyDrivers.length}</div>
            <p className="text-xs text-gray-600">{availableDrivers.length} available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Assignments
            </CardTitle>
            <Phone className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCases.length}</div>
            <p className="text-xs text-gray-600">Current emergencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              On Duty Drivers
            </CardTitle>
            <UserCheck className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onDutyDrivers.length}</div>
            <p className="text-xs text-gray-600">Currently working</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="h-5 w-5 mr-2 text-orange-600" />
            Current Emergency Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedCases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active assignments at the moment
              </div>
            ) : (
              assignedCases.map((case_) => {
                const ambulance = companyAmbulances.find(a => a.id === case_.assignedAmbulanceId)
                const driver = ambulance ? companyDrivers.find(d => d.id === ambulance.driverId) : null
                
                return (
                  <div key={case_.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">
                            Emergency Case #{case_.id}
                          </h3>
                          <Badge className={getStatusColor(case_.status)}>
                            {case_.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{case_.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {case_.location.address}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDateTime(case_.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4 mr-2" />
                        Track
                      </Button>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Ambulance: {ambulance?.vehicleNumber}
                          </p>
                          <p className="text-xs text-blue-700">
                            Type: {ambulance?.type.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Driver: {driver ? `${driver.firstName} ${driver.lastName}` : 'Unassigned'}
                          </p>
                          <p className="text-xs text-blue-700">
                            Contact: {driver?.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2 text-blue-600" />
              Ambulance Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companyAmbulances.map((ambulance) => (
                <div key={ambulance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{ambulance.vehicleNumber}</p>
                    <p className="text-sm text-gray-600">
                      {ambulance.type.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge className={getStatusColor(ambulance.status)}>
                    {ambulance.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="h-5 w-5 mr-2 text-green-600" />
              Driver Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companyDrivers.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                    <p className="text-sm text-gray-600">{driver.phoneNumber}</p>
                  </div>
                  <Badge className={getStatusColor(driver.status)}>
                    {driver.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
