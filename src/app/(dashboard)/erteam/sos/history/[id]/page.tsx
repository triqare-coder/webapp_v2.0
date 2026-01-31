'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Clock, 
  MapPin, 
  User, 
  Phone,
  Heart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Timer,
  Truck,
  Building2,
  FileText,
  Download,
  Printer,
  Share,
  Loader2
} from 'lucide-react'
import { SOSService, SOSRequest } from '@/services/sosService'
import { useStatusColor } from '@/hooks/useHistoricalSOS'

export default function SOSHistoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sosId = params.id as string
  
  const [sosCase, setSOSCase] = useState<SOSRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const getStatusColor = useStatusColor()

  useEffect(() => {
    if (sosId) {
      fetchSOSDetail()
    }
  }, [sosId])

  const fetchSOSDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, we'll use the existing getHistoricalSOSRequests method and filter by ID
      // In a real implementation, you'd want a dedicated getSOSRequestById method
      const result = await SOSService.getHistoricalSOSRequests({ limit: 1000 })
      
      if (result.error) {
        setError(result.error)
        return
      }
      
      const foundCase = result.data?.find(c => c.id === sosId)
      if (!foundCase) {
        setError('SOS case not found')
        return
      }
      
      setSOSCase(foundCase)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SOS case details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />
      case 'transferred':
        return <AlertTriangle className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const calculateResponseTime = (requestedAt: string, assignedAt?: string) => {
    if (!assignedAt) return 'N/A'
    
    const requested = new Date(requestedAt).getTime()
    const assigned = new Date(assignedAt).getTime()
    const diffMs = assigned - requested
    
    if (diffMs <= 0) return '00:00:00'
    
    const totalSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const calculateTotalTime = (requestedAt: string, completedAt?: string) => {
    if (!completedAt) return 'N/A'
    
    const requested = new Date(requestedAt).getTime()
    const completed = new Date(completedAt).getTime()
    const diffMs = completed - requested
    
    if (diffMs <= 0) return '00:00:00'
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SOS Case Details</h1>
            <p className="text-gray-600">Loading case information...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading SOS case details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !sosCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SOS Case Details</h1>
            <p className="text-gray-600">Case not found</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-medium mb-2 text-red-800">Error Loading Case</h3>
            <p className="text-gray-600 mb-4">{error || 'SOS case not found'}</p>
            <div className="flex justify-center space-x-2">
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
              <Button onClick={fetchSOSDetail}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              Case SOS-{sosCase.id.slice(-8)}
              <Badge className={`ml-3 ${getStatusColor(sosCase.status)}`}>
                {getStatusIcon(sosCase.status)}
                <span className="ml-1">{sosCase.status.toUpperCase()}</span>
              </Badge>
            </h1>
            <p className="text-gray-600">
              Requested on {new Date(sosCase.requested_at).toLocaleDateString()} at {new Date(sosCase.requested_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Case Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {calculateResponseTime(sosCase.requested_at, sosCase.assigned_at)}
                </p>
              </div>
              <Timer className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Duration</p>
                <p className="text-2xl font-bold text-green-600">
                  {calculateTotalTime(sosCase.requested_at, sosCase.completed_at)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Auto Assigned</p>
                <p className="text-2xl font-bold text-purple-600">
                  {sosCase.auto_assigned ? 'Yes' : 'No'}
                </p>
              </div>
              <Truck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Case Status</p>
                <p className="text-lg font-bold">
                  {sosCase.status}
                </p>
              </div>
              {getStatusIcon(sosCase.status)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{sosCase.patient?.full_name || 'Unknown Patient'}</h3>
              <div className="flex items-center space-x-4 mt-2">
                {sosCase.patient?.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-1" />
                    {sosCase.patient.phone}
                  </div>
                )}
                {sosCase.patient?.blood_group && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <Heart className="h-3 w-3 mr-1" />
                    {sosCase.patient.blood_group}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">

              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-sm">{sosCase.patient?.email || 'N/A'}</p>
              </div>
            </div>

            {sosCase.patient?.allergies && (
              <>
                <Separator />
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="font-medium text-red-800">Allergies</span>
                  </div>
                  <p className="text-sm text-red-700">{sosCase.patient.allergies}</p>
                </div>
              </>
            )}

            {sosCase.patient?.address_line && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-600 flex items-center mb-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    Location
                  </p>
                  <p className="text-sm">{sosCase.patient.address_line}</p>
                  {(sosCase.patient.latitude && sosCase.patient.longitude) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Coordinates: {sosCase.patient.latitude}, {sosCase.patient.longitude}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact & Driver Information */}
        <div className="space-y-6">
          {/* Emergency Contact */}
          {sosCase.patient?.emergency_contact_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">{sosCase.patient.emergency_contact_name}</p>
                  </div>
                  {sosCase.patient.emergency_contact_phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${sosCase.patient.emergency_contact_phone}`} className="text-blue-600 hover:underline">
                        {sosCase.patient.emergency_contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sosCase.assigned_driver ? (
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">{sosCase.assigned_driver.full_name}</p>
                    <p className="text-sm text-gray-600">{sosCase.assigned_driver.email}</p>
                  </div>
                  {sosCase.assigned_driver.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${sosCase.assigned_driver.phone}`} className="text-blue-600 hover:underline">
                        {sosCase.assigned_driver.phone}
                      </a>
                    </div>
                  )}
                  {sosCase.assigned_at && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Assigned: {new Date(sosCase.assigned_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No driver assigned</p>
              )}
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Case Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">SOS Request Triggered</p>
                <p className="text-sm text-gray-600">{new Date(sosCase.requested_at).toLocaleString()}</p>
              </div>
            </div>

            {sosCase.assigned_at && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Driver Assigned</p>
                  <p className="text-sm text-gray-600">{new Date(sosCase.assigned_at).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    Response time: {calculateResponseTime(sosCase.requested_at, sosCase.assigned_at)}
                  </p>
                </div>
              </div>
            )}

            {sosCase.completed_at && (
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  sosCase.status === 'Arrived at Hospital' ? 'bg-green-500' :
                  sosCase.status === 'Cancelled' ? 'bg-gray-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <p className="font-medium">Case {sosCase.status}</p>
                  <p className="text-sm text-gray-600">{new Date(sosCase.completed_at).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    Total duration: {calculateTotalTime(sosCase.requested_at, sosCase.completed_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
