'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, calculateAge } from '@/lib/utils'
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  Calendar,
  Contact,
  Loader2
} from 'lucide-react'

interface PatientViewPageProps {
  params: Promise<{
    id: string
  }>
}

// Real patient shape returned by GET /api/patients/[id] (PatientService.getPatientById)
interface RealPatient {
  user_id: string
  full_name?: string
  email?: string
  dob?: string
  gender?: string
  blood_group?: string
  allergies?: string
  address_line?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
}

interface PatientSOSCase {
  id: string
  status?: string
  requested_at?: string
}

export default function PatientViewPage({ params }: PatientViewPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const patientId = resolvedParams.id

  const [patient, setPatient] = useState<RealPatient | null>(null)
  const [cases, setCases] = useState<PatientSOSCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/patients/${patientId}`)
        if (res.status === 404) {
          if (!cancelled) {
            setPatient(null)
            setError(null)
          }
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load patient')
        }
        const data = await res.json()
        if (!cancelled) setPatient(data.patient ?? null)

        // Best-effort: load this patient's SOS history. Failure here must not
        // break the patient view, so swallow errors and show an empty state.
        try {
          const sosRes = await fetch(`/api/sos-requests?limit=100`)
          if (sosRes.ok) {
            const sosBody = await sosRes.json()
            const all = Array.isArray(sosBody.data) ? sosBody.data : []
            const mine = all.filter((c: any) => c.patient_id === patientId)
            if (!cancelled) setCases(mine)
          }
        } catch {
          // ignore SOS history failures
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load patient')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [patientId])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Failed to load patient</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Patient Not Found</h1>
          <p className="text-gray-600 mb-4">The patient you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    )
  }

  const fullName = patient.full_name || 'Unknown Patient'
  const age = patient.dob ? calculateAge(new Date(patient.dob)) : null

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
              {fullName}
            </h1>
            <p className="text-gray-600">Patient Details</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/patients/${patient.user_id}/edit`)}>
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
                  <p className="text-lg font-semibold">{fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Age</label>
                  <p className="text-lg font-semibold">{age != null ? `${age} years old` : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  {patient.gender ? (
                    <Badge variant="outline" className="capitalize">
                      {patient.gender}
                    </Badge>
                  ) : (
                    <p className="text-lg font-semibold">N/A</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-lg font-semibold flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {patient.dob ? formatDate(new Date(patient.dob)) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg font-semibold">{patient.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Blood Group</label>
                  <p className="text-lg font-semibold">{patient.blood_group || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Patient ID</label>
                  <p className="text-lg font-semibold break-all">{patient.user_id}</p>
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
              <p className="text-lg">{patient.address_line || 'No address on record'}</p>
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
              {patient.emergency_contact_name || patient.emergency_contact_phone ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-lg font-semibold">{patient.emergency_contact_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Relationship</label>
                    <p className="text-lg font-semibold capitalize">{patient.emergency_contact_relation || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-lg font-semibold flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {patient.emergency_contact_phone || 'N/A'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No emergency contact on record.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.allergies ? (
                <div>
                  <label className="text-sm font-medium text-gray-500">Allergies</label>
                  <p className="text-gray-700 leading-relaxed">{patient.allergies}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No medical information recorded for this patient.</p>
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
              {cases.length > 0 ? (
                <div className="space-y-4">
                  {cases.map((case_) => (
                    <div key={case_.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">Case #{case_.id}</h3>
                        </div>
                        <Badge variant="outline">{case_.status || 'Unknown'}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {case_.requested_at ? formatDate(new Date(case_.requested_at)) : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {case_.status || 'Unknown'}
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
