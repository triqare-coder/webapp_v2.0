'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { formatPhoneNumber } from '@/lib/utils'
import { Plus, Search, Eye, Edit, Users, Phone, Building } from 'lucide-react'

interface Driver {
  id: string
  user_id: string
  transport_company_id: string
  license_number: string
  status: 'available' | 'assigned' | 'on_trip' | 'inactive'
  is_verified: boolean
  user?: {
    id: string
    full_name: string
    email: string
    phone: string
  }
  transport_company?: {
    company_name: string
  }
}

export default function DriversPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/drivers')
        const data = await response.json()

        if (data.success) {
          setDrivers(data.drivers || [])
        } else {
          toast.error('Failed to load drivers')
        }
      } catch (error) {
        console.error('Error loading drivers:', error)
        toast.error('Failed to load drivers')
      } finally {
        setLoading(false)
      }
    }

    loadDrivers()
  }, [])

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver =>
      driver.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.user?.phone?.includes(searchTerm) ||
      driver.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [drivers, searchTerm])

  // Setup pagination
  const pagination = usePagination(filteredDrivers, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'on_trip': return 'bg-purple-100 text-purple-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drivers Management</h1>
          <p className="text-gray-600">Manage ambulance drivers and their assignments</p>
        </div>
        <Button onClick={() => router.push('/drivers/add')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drivers.filter(d => d.status === 'available').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Trip</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {drivers.filter(d => d.status === 'on_trip' || d.status === 'assigned').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {drivers.filter(d => d.status === 'inactive').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or license number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Drivers ({filteredDrivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No drivers found matching your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                pagination.currentPageData.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{driver.user?.full_name || 'Unknown Driver'}</p>
                        <p className="text-sm text-gray-500">ID: {driver.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {driver.user?.phone || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{driver.license_number}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      {driver.transport_company?.company_name || 'Unknown Company'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(driver.status)}>
                      {driver.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/drivers/${driver.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/drivers/${driver.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredDrivers.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
