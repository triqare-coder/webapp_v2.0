'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Building2,
  Truck,
  Calendar,
  Activity,
  MapPin
} from 'lucide-react'

interface Driver {
  id: string
  transport_company_id: string
  transport_company_name: string
  transport_company_registration: string
  full_name: string
  phone_number: string
  email: string
  license_number: string

  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export default function ViewDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, you would fetch data from your API
    const fetchDriver = async () => {
      try {
        const resolvedParams = await params
        const driverId = resolvedParams.id

        // Fetch driver data from API
        const response = await fetch(`/api/drivers/${driverId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch driver')
        }

        const data = await response.json()
        if (data.success && data.driver) {
          // Transform API data to match component interface
          const transformedDriver: Driver = {
            id: data.driver.user_id,
            transport_company_id: data.driver.transport_company_id,
            transport_company_name: data.driver.transport_company?.company_name || 'No company assigned',
            transport_company_registration: data.driver.transport_company?.registration_number || 'No registration',
            full_name: data.driver.user?.full_name || 'Unknown Driver',
            phone_number: data.driver.user?.phone || 'No phone provided',
            email: data.driver.user?.email || 'No email provided',
            license_number: data.driver.license_number || 'No license number',

            status: data.driver.status || 'inactive',
            created_at: data.driver.user?.created_at || new Date().toISOString(),
            updated_at: data.driver.user?.updated_at || new Date().toISOString()
          }

          setDriver(transformedDriver)
        }
      } catch (error) {
        console.error('Error fetching driver:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDriver()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Driver not found</h3>
              <p className="text-gray-600 mb-4">
                The driver you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.push('/admin/drivers')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Drivers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{driver.full_name}</h1>
              <Badge 
                variant={
                  driver.status === 'active' ? 'default' : 
                  driver.status === 'suspended' ? 'destructive' : 'secondary'
                }
              >
                {driver.status}
              </Badge>
            </div>
            <p className="text-gray-600">Driver Profile & Information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/admin/transport-companies/${driver.transport_company_id}`}>
              <Building2 className="h-4 w-4 mr-2" />
              View Company
            </a>
          </Button>
          <Button asChild>
            <a href={`/admin/drivers/${driver.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Driver
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">License Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">{driver.license_number}</div>
            <p className="text-xs text-muted-foreground">
              Driver's license
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              <Badge
                variant={
                  driver.status === 'active' ? 'default' :
                  driver.status === 'suspended' ? 'destructive' : 'secondary'
                }
              >
                {driver.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Current status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company</CardTitle>
            <Building2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-purple-600">
              {driver.transport_company_registration}
            </div>
            <p className="text-xs text-muted-foreground">
              Registration number
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-lg font-semibold">{driver.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">License Number</label>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                  {driver.license_number}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge 
                    variant={
                      driver.status === 'active' ? 'default' : 
                      driver.status === 'suspended' ? 'destructive' : 'secondary'
                    }
                  >
                    {driver.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Email Address</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${driver.email}`} className="text-blue-600 hover:underline">
                  {driver.email}
                </a>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${driver.phone_number}`} className="text-blue-600 hover:underline">
                  {driver.phone_number}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Transport Company
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Company Name</label>
            <p className="text-lg font-semibold">{driver.transport_company_name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Registration Number</label>
            <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
              {driver.transport_company_registration}
            </p>
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/admin/transport-companies/${driver.transport_company_id}`}>
                <Building2 className="h-4 w-4 mr-2" />
                View Company Details
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-gray-500">Created</label>
              <p className="font-medium">{new Date(driver.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-gray-500">Last Updated</label>
              <p className="font-medium">{new Date(driver.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
