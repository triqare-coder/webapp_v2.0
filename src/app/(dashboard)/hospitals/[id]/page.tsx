'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockHospitals, mockSOSCases } from '@/lib/mock-data'
import { formatPhoneNumber } from '@/lib/utils'
import { 
  ArrowLeft, 
  Edit, 
  Building2, 
  Phone, 
  Mail,
  MapPin, 
  Bed,
  Users,
  AlertTriangle,
  Activity
} from 'lucide-react'

interface HospitalViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default function HospitalViewPage({ params }: HospitalViewPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [hospital] = useState(() => mockHospitals.find(h => h.id === resolvedParams.id))
  
  if (!hospital) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Hospital Not Found</h1>
          <p className="text-gray-600 mb-4">The hospital you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/hospitals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hospitals
          </Button>
        </div>
      </div>
    )
  }

  const assignedCases = mockSOSCases.filter(c => c.assignedHospitalId === hospital.id)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{hospital.name}</h1>
            <p className="text-gray-600">Hospital Details</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/hospitals/${hospital.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Hospital
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases">Emergency Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Hospital Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Hospital Name</label>
                  <p className="text-lg font-semibold">{hospital.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {formatPhoneNumber(hospital.phone)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {hospital.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Hospital ID</label>
                  <p className="text-lg font-semibold">{hospital.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Hospital Type</label>
                  <p className="text-lg font-semibold capitalize">
                    {hospital.hospital_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg font-semibold capitalize">
                    <Badge variant={hospital.status === 'active' ? 'default' : 'secondary'}>
                      {hospital.status}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-lg">{hospital.address_line}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Latitude</label>
                    <p className="text-lg font-mono">{hospital.latitude || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Longitude</label>
                    <p className="text-lg font-mono">{hospital.longitude || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Person</label>
                  <p className="text-lg">{hospital.emergency_contact_person}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Phone</label>
                  <p className="text-lg">{hospital.emergency_contact_phone}</p>
                </div>
                {hospital.emergency_contact_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Email</label>
                    <p className="text-lg">{hospital.emergency_contact_email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Cases Assigned
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
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No emergency cases currently assigned to this hospital.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
