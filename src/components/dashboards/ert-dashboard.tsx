'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockSOSCases, mockAmbulances } from '@/lib/mock-data'
import { formatDateTime, getSeverityColor, getStatusColor } from '@/lib/utils'
import {
  AlertTriangle,
  MapPin,
  Clock,
  Truck,
  Phone,
  Navigation
} from 'lucide-react'

export function ERTDashboard() {
  const activeCases = mockSOSCases.filter(c => c.status !== 'completed' && c.status !== 'cancelled')
  const availableAmbulances = mockAmbulances.filter(a => a.status === 'available')
  const dispatchedAmbulances = mockAmbulances.filter(a => a.status === 'dispatched')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Response Dashboard</h1>
          <p className="text-gray-600">Monitor and respond to emergency situations</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            Live Map
          </Button>
          <Button>
            <AlertTriangle className="h-4 w-4 mr-2" />
            New SOS Alert
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Emergencies
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeCases.length}</div>
            <p className="text-xs text-gray-600">Requiring immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Available Ambulances
            </CardTitle>
            <Truck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableAmbulances.length}</div>
            <p className="text-xs text-gray-600">Ready for dispatch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Dispatched Units
            </CardTitle>
            <Navigation className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dispatchedAmbulances.length}</div>
            <p className="text-xs text-gray-600">En route to emergencies</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Emergency Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Active Emergency Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeCases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active emergency cases at the moment
              </div>
            ) : (
              activeCases.map((case_) => (
                <div key={case_.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">
                          {case_.patient.firstName} {case_.patient.lastName}
                        </h3>
                        <Badge className={getSeverityColor(case_.severity)}>
                          {case_.severity}
                        </Badge>
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
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {case_.patient.phoneNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {case_.status === 'pending' && (
                        <Button size="sm">
                          <Truck className="h-4 w-4 mr-2" />
                          Assign Ambulance
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4 mr-2" />
                        View on Map
                      </Button>
                    </div>
                  </div>
                  
                  {case_.assignedAmbulance && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Assigned: {case_.assignedAmbulance.vehicleNumber}
                          </p>
                          <p className="text-xs text-blue-700">
                            Type: {case_.assignedAmbulance.type.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {case_.assignedAmbulance.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Ambulances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2 text-green-600" />
            Available Ambulances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAmbulances.map((ambulance) => (
              <div key={ambulance.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{ambulance.vehicleNumber}</h3>
                  <Badge className={getStatusColor(ambulance.status)}>
                    {ambulance.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Type: {ambulance.type.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Equipment: {ambulance.equipment.slice(0, 2).join(', ')}
                  {ambulance.equipment.length > 2 && ` +${ambulance.equipment.length - 2} more`}
                </p>
                <Button size="sm" className="w-full">
                  Dispatch
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
