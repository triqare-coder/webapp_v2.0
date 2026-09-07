'use client'

/**
 * ERT driver detail — the destination for "View Details" on Live Monitoring >
 * Driver Status.
 *
 * That button used to push to /admin/drivers/<id>. hasAccessToPath() only grants
 * an 'ert' role paths under /erteam/, so every click landed the dispatcher on
 * "Access Denied" and bounced them back to the ERT dashboard. This is the same
 * record rendered inside the section ERT can actually reach, and read-only:
 * /api/drivers/[id] gates its PUT behind requireAdmin(), so a dispatcher has no
 * way to save an edit even if we offered the form.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  AlertTriangle,
  Building,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
} from 'lucide-react'
import {
  formatLastSeen,
  getDriverPresence,
  PRESENCE_BADGE_CLASS,
} from '@/lib/driverPresence'

interface DriverRecord {
  id: string
  user_id: string
  license_number?: string | null
  aadhar_number?: string | null
  is_verified?: boolean
  status?: string | null
  current_request_id?: string | null
  latitude?: number | null
  longitude?: number | null
  last_updated_at?: string | null
  address_line?: string | null
  user?: {
    full_name?: string | null
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    created_at?: string | null
  } | null
  transport_company?: {
    company_name?: string | null
    registration_number?: string | null
    is_verified?: boolean
  } | null
  country?: { id: string; name: string } | null
  state?: { id: string; name: string } | null
  city?: { id: string; name: string } | null
  pincode?: { id: string; code: string } | null
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm text-gray-900 break-words">{children}</div>
      </div>
    </div>
  )
}

export default function ERTDriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [driver, setDriver] = useState<DriverRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDriver = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { id } = await params
      const response = await fetch(`/api/drivers/${id}`)
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success || !data.driver) {
        setError(data?.error || 'Could not load this driver.')
        return
      }
      setDriver(data.driver as DriverRecord)
    } catch (err) {
      console.error('Error fetching driver:', err)
      setError('Could not load this driver.')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchDriver()
  }, [fetchDriver])

  const backToList = (
    <Button variant="ghost" size="sm" onClick={() => router.push('/erteam/drivers')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Driver Status
    </Button>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {backToList}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          <span className="ml-2 text-gray-600">Loading driver...</span>
        </div>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="space-y-6">
        {backToList}
        <Card>
          <CardContent className="p-12 text-center text-red-500">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">Driver Not Available</h3>
            <p className="mb-4">{error}</p>
            <Button onClick={fetchDriver} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const name =
    driver.user?.full_name ||
    [driver.user?.first_name, driver.user?.last_name].filter(Boolean).join(' ') ||
    'Unknown driver'

  const { presence, label, minutesSinceHeartbeat } = getDriverPresence({
    status: driver.status,
    lastUpdatedAt: driver.last_updated_at,
    currentRequestId: driver.current_request_id,
  })

  const area = [driver.city?.name, driver.state?.name, driver.country?.name]
    .filter(Boolean)
    .join(', ')

  const coordinates =
    driver.latitude != null && driver.longitude != null
      ? `${driver.latitude.toFixed(4)}, ${driver.longitude.toFixed(4)}`
      : null

  return (
    <div className="space-y-6">
      {backToList}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-900">
            <UserCheck className="mr-2 h-6 w-6" />
            {name}
          </h1>
          <p className="text-gray-600">
            Driver record as dispatch sees it — read-only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={PRESENCE_BADGE_CLASS[presence]}>{label}</Badge>
          <Badge variant="secondary">
            {driver.is_verified ? 'Verified' : 'Verification pending'}
          </Badge>
          <Button onClick={fetchDriver} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current assignment */}
      {driver.current_request_id && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <p className="text-sm font-medium text-red-800">Currently on an SOS</p>
              <p className="text-sm text-red-600">
                Case {driver.current_request_id.slice(0, 8)}...
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/erteam/sos/${driver.current_request_id}`}>Open case</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field icon={Phone} label="Phone">
              {driver.user?.phone ? (
                <a className="text-blue-600 hover:underline" href={`tel:${driver.user.phone}`}>
                  {driver.user.phone}
                </a>
              ) : (
                'No phone number'
              )}
            </Field>
            <Field icon={Mail} label="Email">
              {driver.user?.email ? (
                <a className="text-blue-600 hover:underline" href={`mailto:${driver.user.email}`}>
                  {driver.user.email}
                </a>
              ) : (
                'No email'
              )}
            </Field>
            <Field icon={Building} label="Transport company">
              {driver.transport_company?.company_name || 'No company assigned'}
              {driver.transport_company?.registration_number && (
                <span className="text-gray-500">
                  {' '}
                  ({driver.transport_company.registration_number})
                </span>
              )}
            </Field>
          </CardContent>
        </Card>

        {/* Live status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field icon={Truck} label="Declared status">
              <span className="capitalize">{driver.status || 'unknown'}</span>
            </Field>
            <Field icon={Clock} label="Last position report">
              {formatLastSeen(minutesSinceHeartbeat)}
              {driver.last_updated_at && (
                <span className="text-gray-500">
                  {' '}
                  ({new Date(driver.last_updated_at).toLocaleString()})
                </span>
              )}
            </Field>
            <Field icon={MapPin} label="Current location">
              {coordinates ? (
                <a
                  className="text-blue-600 hover:underline"
                  href={`https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {coordinates}
                </a>
              ) : (
                'No position reported'
              )}
            </Field>
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field icon={ShieldCheck} label="License number">
              {driver.license_number || 'Not on record'}
            </Field>
            <Field icon={UserCheck} label="Joined">
              {driver.user?.created_at
                ? new Date(driver.user.created_at).toLocaleDateString()
                : 'Unknown'}
            </Field>
          </CardContent>
        </Card>

        {/* Base location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Base location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field icon={MapPin} label="Address">
              {driver.address_line || 'Not on record'}
            </Field>
            <Field icon={MapPin} label="Area">
              {area || 'Not on record'}
              {driver.pincode?.code && (
                <span className="text-gray-500"> — {driver.pincode.code}</span>
              )}
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
