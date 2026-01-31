'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Calendar,
  Users,
  Truck,
  Activity
} from 'lucide-react'

interface TransportCompany {
  id: string
  name: string
  address: string
  phone_number: string
  email: string
  registration_number: string
  created_at: string
  updated_at: string
  status: 'active' | 'inactive'
}

interface Driver {
  id: string
  full_name: string
  phone_number: string
  email: string
  license_number: string
  status: string
  assigned_ambulance_id: string | null
}

export default function ViewTransportCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [company, setCompany] = useState<TransportCompany | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const resolvedParams = await params
        const companyId = resolvedParams.id

        // Fetch transport company data from API
        const response = await fetch(`/api/transport-companies/${companyId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch transport company')
        }

        const data = await response.json()
        if (data.success && data.transportCompany) {
          // Transform API data to match component interface
          const transformedCompany: TransportCompany = {
            id: data.transportCompany.user_id,
            name: data.transportCompany.company_name,
            address: data.transportCompany.address_line || 'No address provided',
            phone_number: data.transportCompany.user?.phone || 'No phone provided',
            email: data.transportCompany.user?.email || 'No email provided',
            registration_number: data.transportCompany.registration_number || 'No registration number',
            created_at: data.transportCompany.user?.created_at || new Date().toISOString(),
            updated_at: data.transportCompany.user?.updated_at || new Date().toISOString(),
            status: data.transportCompany.is_verified ? 'active' : 'inactive'
          }

          setCompany(transformedCompany)
        }

        // Fetch drivers for this transport company
        const driversResponse = await fetch(`/api/drivers?transport_company_id=${companyId}&limit=100`)
        if (driversResponse.ok) {
          const driversData = await driversResponse.json()
          if (driversData.success && driversData.drivers) {
            // Transform drivers data to match component interface
            const transformedDrivers: Driver[] = driversData.drivers.map((driver: any) => ({
              id: driver.user_id,
              full_name: driver.user?.full_name || 'Unknown Driver',
              phone_number: driver.user?.phone || 'No phone',
              email: driver.user?.email || 'No email',
              license_number: driver.license_number || 'No license',
              status: driver.status || 'inactive',
              assigned_ambulance_id: null // This would come from ambulance assignments if implemented
            }))

            setDrivers(transformedDrivers)
          }
        }
      } catch (error) {
        console.error('Error fetching company:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompany()
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

  if (!company) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Company not found</h3>
              <p className="text-gray-600 mb-4">
                The transport company you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.push('/admin/transport-companies')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Companies
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
              <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
              <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                {company.status}
              </Badge>
            </div>
            <p className="text-gray-600">Transport Company Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/admin/transport-companies/${company.id}/drivers`}>
              <Users className="h-4 w-4 mr-2" />
              Manage Drivers
            </a>
          </Button>
          <Button asChild>
            <a href={`/admin/transport-companies/${company.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Company
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered drivers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drivers.filter(d => d.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {drivers.filter(d => d.assigned_ambulance_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              With ambulances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registration</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600 font-mono">
              {company.registration_number}
            </div>
            <p className="text-xs text-muted-foreground">
              Registration number
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Company Name</label>
                <p className="text-lg font-semibold">{company.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Registration Number</label>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                  {company.registration_number}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                    {company.status}
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
                <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                  {company.email}
                </a>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Phone Number</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${company.phone_number}`} className="text-blue-600 hover:underline">
                  {company.phone_number}
                </a>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <p className="text-gray-900">{company.address || 'No address provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Drivers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Drivers ({drivers.length})
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href={`/admin/transport-companies/${company.id}/drivers`}>
                View All Drivers
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {drivers.length > 0 ? (
            <div className="space-y-4">
              {drivers.slice(0, 5).map((driver) => (
                <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{driver.full_name}</h4>
                      <p className="text-sm text-gray-600">{driver.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                      {driver.status}
                    </Badge>
                    {driver.assigned_ambulance_id && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {driver.assigned_ambulance_id}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {drivers.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild>
                    <a href={`/admin/transport-companies/${company.id}/drivers`}>
                      View {drivers.length - 5} More Drivers
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers registered</h3>
              <p className="text-gray-600 mb-4">
                This company hasn't registered any drivers yet.
              </p>
              <Button asChild>
                <a href={`/admin/transport-companies/${company.id}/drivers/add`}>
                  Add First Driver
                </a>
              </Button>
            </div>
          )}
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
              <p className="font-medium">{new Date(company.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-gray-500">Last Updated</label>
              <p className="font-medium">{new Date(company.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
