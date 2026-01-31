'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockAmbulances, mockDrivers, mockTransportCompanies, mockSOSCases } from '@/lib/mock-data'
import { formatPhoneNumber } from '@/lib/utils'
import { 
  ArrowLeft, 
  Edit, 
  Truck, 
  MapPin, 
  User,
  Building,
  Activity,
  AlertTriangle,
  Package
} from 'lucide-react'

interface AmbulanceViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default function AmbulanceViewPage({ params }: AmbulanceViewPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [ambulance] = useState(() => mockAmbulances.find(a => a.id === resolvedParams.id))
  
  if (!ambulance) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ambulance Not Found</h1>
          <p className="text-gray-600 mb-4">The ambulance you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/ambulances')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ambulances
          </Button>
        </div>
      </div>
    )
  }

  const driver = mockDrivers.find(d => d.id === ambulance.driverId)
  const transportCompany = mockTransportCompanies.find(tc => tc.id === ambulance.transportCompanyId)
  const assignedCases = mockSOSCases.filter(c => c.assignedAmbulanceId === ambulance.id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'on_call': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'out_of_service': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'basic': return 'Basic Life Support (BLS)'
      case 'advanced': return 'Advanced Life Support (ALS)'
      case 'critical_care': return 'Critical Care Transport'
      default: return type
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ambulance.vehicleNumber}</h1>
            <p className="text-gray-600">Ambulance Details</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/ambulances/${ambulance.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Ambulance
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Vehicle Number</label>
                  <p className="text-lg font-semibold">{ambulance.vehicleNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-lg font-semibold">{getTypeDescription(ambulance.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(ambulance.status)}>
                    {ambulance.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ambulance ID</label>
                  <p className="text-lg font-semibold">{ambulance.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Latitude</label>
                  <p className="text-lg font-mono">{ambulance.currentLocation.lat}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Longitude</label>
                  <p className="text-lg font-mono">{ambulance.currentLocation.lng}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {driver ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-lg font-semibold">{driver.firstName} {driver.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-lg font-semibold">{formatPhoneNumber(driver.phoneNumber)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">License Number</label>
                    <p className="text-lg font-semibold">{driver.licenseNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge className={driver.status === 'available' ? 'bg-green-100 text-green-800' : 
                      driver.status === 'on_duty' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {driver.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No driver currently assigned to this ambulance.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transport Company */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Transport Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transportCompany ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company Name</label>
                    <p className="text-lg font-semibold">{transportCompany.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-lg font-semibold">{formatPhoneNumber(transportCompany.phoneNumber)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg font-semibold">{transportCompany.email}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No transport company information available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Medical Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ambulance.equipment && ambulance.equipment.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ambulance.equipment.map((item, index) => (
                    <div key={index} className="flex items-center p-3 border rounded-lg">
                      <Activity className="h-5 w-5 mr-3 text-blue-600" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No equipment information available for this ambulance.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedCases.length > 0 ? (
                <div className="space-y-4">
                  {assignedCases.map((case_) => (
                    <div key={case_.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {case_.patient.firstName} {case_.patient.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{case_.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={`${case_.severity === 'critical' ? 'bg-red-100 text-red-800' : 
                            case_.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            case_.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}`}>
                            {case_.severity}
                          </Badge>
                          <Badge variant="outline">
                            {case_.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Case ID:</span> {case_.id}
                        </div>
                        <div>
                          <span className="font-medium">Patient Phone:</span> {case_.patient.phoneNumber}
                        </div>
                        <div>
                          <span className="font-medium">Response Time:</span> {case_.responseTime || 'N/A'}m
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No emergency assignments for this ambulance.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
