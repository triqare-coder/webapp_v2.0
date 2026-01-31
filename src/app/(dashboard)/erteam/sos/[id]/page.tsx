'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  User,
  Activity,
  CheckCircle,
  XCircle,
  Timer,
  Truck,
  RefreshCw,
  Edit,
  Plus
} from 'lucide-react'
import { type SOSRequest } from '@/services/sosService'
import { emergencyContactService, type EmergencyContact } from '@/services/emergencyContactService'
import { toast } from 'sonner'

export default function SOSDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sosId = params.id as string

  const [sosRequest, setSOSRequest] = useState<SOSRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Load SOS request details
  const loadSOSRequest = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sos/${sosId}`)
      const result = await response.json()

      if (result.error) {
        toast.error(`Failed to load SOS request: ${result.error}`)
        return
      }

      setSOSRequest(result.data)
    } catch (error) {
      toast.error('Failed to load SOS request details')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await loadSOSRequest()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  useEffect(() => {
    if (sosId) {
      loadSOSRequest()
    }
  }, [sosId])

  // Utility functions
  const getStatusColor = (status: SOSRequest['status']) => {
    switch (status) {
      case 'SOS Triggered': return 'bg-red-100 text-red-800'
      case 'Driver En Route': return 'bg-blue-100 text-blue-800'
      case 'Transport Arrived': return 'bg-yellow-100 text-yellow-800'
      case 'User Picked Up': return 'bg-purple-100 text-purple-800'
      case 'Arrived at Hospital': return 'bg-green-100 text-green-800'
      case 'Cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: SOSRequest['status']) => {
    switch (status) {
      case 'SOS Triggered': return <AlertTriangle className="h-4 w-4" />
      case 'Driver En Route': return <Truck className="h-4 w-4" />
      case 'Transport Arrived': return <MapPin className="h-4 w-4" />
      case 'User Picked Up': return <Activity className="h-4 w-4" />
      case 'Arrived at Hospital': return <CheckCircle className="h-4 w-4" />
      case 'Cancelled': return <XCircle className="h-4 w-4" />
      default: return <Timer className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading SOS request details...</p>
        </div>
      </div>
    )
  }

  if (!sosRequest) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">SOS Request Not Found</h2>
          <p className="text-gray-600 mb-4">The requested SOS case could not be found.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              SOS Request Details
            </h1>
            <p className="text-gray-600">
              Case ID: {sosRequest.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge className={getStatusColor(sosRequest.status)}>
            {getStatusIcon(sosRequest.status)}
            <span className="ml-2">{sosRequest.status}</span>
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient & Emergency Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <p className="text-lg font-semibold">{sosRequest.patient?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p>{sosRequest.patient?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {sosRequest.patient?.phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Blood Group</label>
                  <div>
                    {sosRequest.patient?.blood_group ? (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        🩸 {sosRequest.patient.blood_group}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </div>
                </div>



              </div>

              {sosRequest.patient?.allergies && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <label className="text-sm font-medium text-red-800 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Critical Allergies
                  </label>
                  <p className="text-red-700 font-medium mt-1">{sosRequest.patient.allergies}</p>
                </div>
              )}



              {sosRequest.patient?.address_line && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <p className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    {sosRequest.patient.address_line}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Emergency Contacts
                </CardTitle>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sosRequest.patient?.emergency_contacts && sosRequest.patient.emergency_contacts.length > 0 ? (
                <div className="space-y-4">
                  {sosRequest.patient.emergency_contacts.map((contact, index) => (
                    <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {contact.phone}
                            </p>
                            {contact.relationship && (
                              <p className="text-sm text-gray-500">
                                Relationship: {contact.relationship}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Contact {index + 1}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No emergency contacts found</p>
                  <p className="text-sm">Add emergency contacts for this patient</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status & Timeline */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Request Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge className={`${getStatusColor(sosRequest.status)} text-lg px-4 py-2`}>
                  {getStatusIcon(sosRequest.status)}
                  <span className="ml-2">{sosRequest.status}</span>
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Requested At</label>
                  <p className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTimestamp(sosRequest.requested_at)}
                  </p>
                  <p className="text-xs text-gray-500 ml-6">
                    {formatTimeAgo(sosRequest.requested_at)}
                  </p>
                </div>

                {sosRequest.assigned_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Assigned At</label>
                    <p className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatTimestamp(sosRequest.assigned_at)}
                    </p>
                    <p className="text-xs text-gray-500 ml-6">
                      {formatTimeAgo(sosRequest.assigned_at)}
                    </p>
                  </div>
                )}

                {sosRequest.completed_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Completed At</label>
                    <p className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatTimestamp(sosRequest.completed_at)}
                    </p>
                    <p className="text-xs text-gray-500 ml-6">
                      {formatTimeAgo(sosRequest.completed_at)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Driver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sosRequest.assigned_driver ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{sosRequest.assigned_driver.full_name}</p>
                    <p className="text-sm text-gray-600">{sosRequest.assigned_driver.email}</p>
                    {sosRequest.assigned_driver.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {sosRequest.assigned_driver.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Driver
                    </Button>
                    <Button size="sm" variant="outline">
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No driver assigned</p>
                  <Button size="sm" className="mt-2">
                    <User className="h-4 w-4 mr-2" />
                    Assign Driver
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Update Status
              </Button>
              <Button className="w-full" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                View on Map
              </Button>
              <Button className="w-full" variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Call Patient
              </Button>
              <Button className="w-full" variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                View Timeline
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
