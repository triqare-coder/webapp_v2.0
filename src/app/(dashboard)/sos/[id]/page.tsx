'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SOSService, type SOSRequest } from '@/services/sosService'
import { formatDate, formatPhoneNumber } from '@/lib/utils'
import { 
  ArrowLeft, 
  Edit, 
  AlertTriangle, 
  User, 
  Phone,
  MapPin, 
  Clock,
  Building2,
  Truck,
  Activity
} from 'lucide-react'

interface SOSCaseViewPageProps {
  params: Promise<{
    id: string
  }>
}

export default function SOSCaseViewPage({ params }: SOSCaseViewPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [sosCase, setSOSCase] = useState<SOSRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSOSCase = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/sos-requests/${resolvedParams.id}`)

        if (!response.ok) {
          throw new Error('Failed to load SOS case')
        }

        const data = await response.json()
        if (data.success && data.sos_request) {
          setSOSCase(data.sos_request)
        } else {
          throw new Error(data.error || 'SOS case not found')
        }
      } catch (error) {
        console.error('Error loading SOS case:', error)
        setError(error instanceof Error ? error.message : 'Failed to load SOS case')
      } finally {
        setLoading(false)
      }
    }

    loadSOSCase()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading Emergency Case...</h1>
        </div>
      </div>
    )
  }

  if (error || !sosCase) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Emergency Case Not Found</h1>
          <p className="text-gray-600 mb-4">{error || "The emergency case you're looking for doesn't exist."}</p>
          <Button onClick={() => router.push('/sos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Emergency Cases
          </Button>
        </div>
      </div>
    )
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'dispatched': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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
            <h1 className="text-3xl font-bold text-gray-900">Emergency Case #{sosCase.id}</h1>
            <p className="text-gray-600">Case Details and Response Information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Badge className={getStatusColor(sosCase.status)}>
            {sosCase.status}
          </Badge>
          <Button onClick={() => router.push(`/sos/${sosCase.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Case
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patient">Patient Info</TabsTrigger>
          <TabsTrigger value="response">Response Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Case Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Case Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Case ID</label>
                  <p className="text-lg font-semibold">{sosCase.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(sosCase.status)}>
                    {sosCase.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDate(new Date(sosCase.requested_at))}
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>






        </TabsContent>

        <TabsContent value="patient" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sosCase.patient ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-lg font-semibold">{sosCase.patient.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg font-semibold">{sosCase.patient.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-lg font-semibold">{sosCase.patient.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Blood Group</label>
                    <p className="text-lg font-semibold">{sosCase.patient.blood_group || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Allergies</label>
                    <p className="text-lg font-semibold">{sosCase.patient.allergies || 'None reported'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                    <p className="text-lg font-semibold">{sosCase.patient.emergency_contact_name || 'Not provided'}</p>
                    <p className="text-sm text-gray-600">{sosCase.patient.emergency_contact_phone || 'No phone'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-sm text-gray-700">{sosCase.patient.address_line || 'Not provided'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Patient information not available or unknown patient.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-6">
          {/* Assigned Driver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sosCase.assigned_driver ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Driver Name</label>
                    <p className="text-lg font-semibold">{sosCase.assigned_driver.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg font-semibold">{sosCase.assigned_driver.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-lg font-semibold">{sosCase.assigned_driver.phone || 'Not provided'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No driver assigned to this case yet.</p>
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>
      </Tabs>
    </div>
  )
}
