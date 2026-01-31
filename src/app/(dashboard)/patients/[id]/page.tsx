'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockPatients, mockSOSCases } from '@/lib/mock-data'
import { formatDate, formatPhoneNumber, calculateAge } from '@/lib/utils'
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Phone, 
  MapPin, 
  Heart, 
  AlertTriangle,
  Calendar,
  Contact
} from 'lucide-react'

interface PatientViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PatientViewPage({ params }: PatientViewPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [patient] = useState(() => mockPatients.find(p => p.id === resolvedParams.id))
  
  if (!patient) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Patient Not Found</h1>
          <p className="text-gray-600 mb-4">The patient you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    )
  }

  const patientCases = mockSOSCases.filter(c => c.patientId === patient.id)
  const age = calculateAge(patient.dateOfBirth)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-600">Patient Details</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/patients/${patient.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Patient
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical History</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg font-semibold">{patient.firstName} {patient.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Age</label>
                  <p className="text-lg font-semibold">{age} years old</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <Badge variant="outline" className="capitalize">
                    {patient.gender}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(patient.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {formatPhoneNumber(patient.phoneNumber)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Patient ID</label>
                  <p className="text-lg font-semibold">{patient.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{patient.address}</p>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Contact className="h-5 w-5 mr-2" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg font-semibold">{patient.emergencyContact.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Relationship</label>
                  <p className="text-lg font-semibold capitalize">{patient.emergencyContact.relationship}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {formatPhoneNumber(patient.emergencyContact.phoneNumber)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.medicalHistory ? (
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">{patient.medicalHistory}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No medical history recorded for this patient.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Cases History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientCases.length > 0 ? (
                <div className="space-y-4">
                  {patientCases.map((case_) => (
                    <div key={case_.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">Case #{case_.id}</h3>
                          <p className="text-sm text-gray-600">{case_.description}</p>
                        </div>
                        <Badge className={`${case_.severity === 'critical' ? 'bg-red-100 text-red-800' : 
                          case_.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          case_.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}`}>
                          {case_.severity}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Date:</span> {formatDate(case_.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {case_.status.replace('_', ' ')}
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
                  <p>No emergency cases recorded for this patient.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
