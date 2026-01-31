'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  FileText,
  Truck,
  ArrowLeft,
  Building2,
  Activity
} from 'lucide-react'

interface Driver {
  id: string
  transport_company_id: string
  full_name: string
  phone_number: string
  email: string
  license_number: string
  certification_documents: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

interface TransportCompany {
  id: string
  name: string
  registration_number: string
}

export default function CompanyDriversPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all')
  const [company, setCompany] = useState<TransportCompany | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, you would fetch data from your API
    const fetchData = async () => {
      try {
        // Mock data - replace with actual API calls
        const mockCompany: TransportCompany = {
          id: resolvedParams.id,
          name: 'Metro Emergency Transport',
          registration_number: 'TC-2024-001'
        }

        const mockDrivers: Driver[] = [
          {
            id: '1',
            transport_company_id: resolvedParams.id,
            full_name: 'John Smith',
            phone_number: '+1-555-0201',
            email: 'john.smith@metroemt.com',
            license_number: 'DL-12345',
            certification_documents: 'EMT-Basic, CPR',
            status: 'active',
            created_at: '2024-01-20T10:00:00Z',
            updated_at: '2024-01-20T10:00:00Z'
          },
          {
            id: '2',
            transport_company_id: resolvedParams.id,
            full_name: 'Sarah Johnson',
            phone_number: '+1-555-0202',
            email: 'sarah.johnson@metroemt.com',
            license_number: 'DL-12346',
            certification_documents: 'EMT-Paramedic, ACLS',
            status: 'active',
            created_at: '2024-01-25T14:30:00Z',
            updated_at: '2024-02-01T09:15:00Z'
          },
          {
            id: '3',
            transport_company_id: resolvedParams.id,
            full_name: 'Mike Wilson',
            phone_number: '+1-555-0203',
            email: 'mike.wilson@metroemt.com',
            license_number: 'DL-12347',
            certification_documents: 'EMT-Basic',
            status: 'suspended',
            created_at: '2024-02-01T16:45:00Z',
            updated_at: '2024-02-10T11:20:00Z'
          }
        ]

        setCompany(mockCompany)
        setDrivers(mockDrivers)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id])

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const matchesSearch = driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           driver.license_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || driver.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [drivers, searchTerm, selectedStatus])

  // Setup pagination
  const pagination = usePagination(filteredDrivers, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  })

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      // In a real app, you would call your API here
      console.log('Deleting driver:', id)
    }
  }

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
            <h1 className="text-3xl font-bold text-gray-900">
              👥 {company.name} - Drivers
            </h1>
            <p className="text-gray-600">
              Manage drivers for {company.name} ({company.registration_number})
            </p>
          </div>
        </div>
        <Button asChild>
          <a href={`/admin/transport-companies/${resolvedParams.id}/drivers/add`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Driver
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {drivers.filter(d => d.status === 'suspended').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search drivers by name, email, or license number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('all')}
                size="sm"
              >
                All ({drivers.length})
              </Button>
              <Button
                variant={selectedStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('active')}
                size="sm"
              >
                Active ({drivers.filter(d => d.status === 'active').length})
              </Button>
              <Button
                variant={selectedStatus === 'inactive' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('inactive')}
                size="sm"
              >
                Inactive ({drivers.filter(d => d.status === 'inactive').length})
              </Button>
              <Button
                variant={selectedStatus === 'suspended' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('suspended')}
                size="sm"
              >
                Suspended ({drivers.filter(d => d.status === 'suspended').length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers List */}
      {filteredDrivers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search criteria.' : 'This company has no drivers yet.'}
              </p>
              {!searchTerm && (
                <Button asChild>
                  <a href={`/admin/transport-companies/${resolvedParams.id}/drivers/add`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Driver
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6">
            {pagination.currentPageData.map((driver) => (
          <Card key={driver.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{driver.full_name}</h3>
                    <Badge 
                      variant={
                        driver.status === 'active' ? 'default' : 
                        driver.status === 'suspended' ? 'destructive' : 'secondary'
                      }
                    >
                      {driver.status}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {driver.license_number}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {driver.phone_number}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {driver.email}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      {driver.certification_documents}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    Created: {new Date(driver.created_at).toLocaleDateString()} • 
                    Updated: {new Date(driver.updated_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/drivers/${driver.id}`}>
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/admin/drivers/${driver.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(driver.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
          </div>

          {/* Pagination */}
          <div className="mt-6">
            <PaginationWithInfo
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        </>
      )}
    </div>
  )
}
