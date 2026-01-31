'use client'

import React, { useState, useEffect } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus,
  Phone,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { format } from 'date-fns'

interface EmergencyContact {
  id: string
  patient_id: string
  name: string
  phone: string
  relationship?: string
  created_at: string
  updated_at: string
}

interface SOSRequest {
  id: string
  patient_id: string
  patient_name: string
  patient_email: string
  patient_phone: string
  patient_details: {
    blood_group?: string
    allergies?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    latitude?: number
    longitude?: number
    address_line?: string
    emergency_contacts: EmergencyContact[]
  }
  assigned_driver?: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  requested_at: string
  assigned_at?: string | null
  completed_at?: string | null
  auto_assigned: boolean
  status: string
}

interface SOSRequestsDataTableProps {
  onView?: (request: SOSRequest) => void
  onEdit?: (request: SOSRequest) => void
  onDelete?: (request: SOSRequest) => void
  onAssignDriver?: (request: SOSRequest) => void
  refreshTrigger?: number
  statusFilter?: string
  showStatusColumn?: boolean
  initialPageSize?: number
}

export default function SOSRequestsDataTable({
  onView,
  onEdit,
  onDelete,
  onAssignDriver,
  refreshTrigger = 0,
  statusFilter,
  showStatusColumn = true,
  initialPageSize = 10
}: SOSRequestsDataTableProps) {
  const [requests, setRequests] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and pagination
  const [search, setSearch] = useState('')
  const [internalStatusFilter, setInternalStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(initialPageSize)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Use external status filter if provided, otherwise use internal
  const currentStatusFilter = statusFilter || internalStatusFilter
  
  // Sorting
  const [sortBy, setSortBy] = useState('requested_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        status: currentStatusFilter === 'all' ? '' : currentStatusFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/sos-requests?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch SOS requests')
      }

      setRequests(result.data || [])
      setTotal(result.pagination?.total || 0)
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (err) {
      console.error('Error fetching SOS requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch SOS requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [page, limit, search, currentStatusFilter, sortBy, sortOrder, refreshTrigger])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, currentStatusFilter])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'SOS Triggered': 'bg-red-100 text-red-800',
      'Driver Assigned': 'bg-yellow-100 text-yellow-800',
      'Driver En Route': 'bg-blue-100 text-blue-800',
      'Patient Picked Up': 'bg-purple-100 text-purple-800',
      'At Hospital': 'bg-indigo-100 text-indigo-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
  }

  const handleCallPatient = (phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self')
    }
  }

  const handleCallEmergencyContact = (phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading SOS requests...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>SOS Requests ({total})</span>
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* Status Filter - only show if not using external status filter */}
            {!statusFilter && (
              <Select value={internalStatusFilter} onValueChange={setInternalStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SOS Triggered">SOS Triggered</SelectItem>
                  <SelectItem value="Driver Assigned">Driver Assigned</SelectItem>
                  <SelectItem value="Driver En Route">Driver En Route</SelectItem>
                  <SelectItem value="Patient Picked Up">Patient Picked Up</SelectItem>
                  <SelectItem value="At Hospital">At Hospital</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <Table className={`table-fixed ${!showStatusColumn ? 'no-status-column' : ''}`}>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 w-[180px]"
                  onClick={() => handleSort('requested_at')}
                >
                  <div className="table-cell-flex">
                    <span>Requested</span>
                    {getSortIcon('requested_at')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 min-w-[250px]"
                  onClick={() => handleSort('patient_name')}
                >
                  <div className="table-cell-flex">
                    <span>Patient</span>
                    {getSortIcon('patient_name')}
                  </div>
                </TableHead>
                {showStatusColumn && (
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 w-[160px]"
                    onClick={() => handleSort('status')}
                  >
                    <div className="table-cell-flex">
                      <span>Status</span>
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                )}
                <TableHead className="w-[200px]">Driver</TableHead>
                <TableHead className="w-[180px]">Emergency Contact</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showStatusColumn ? 6 : 5} className="text-center py-8 text-gray-500">
                    No SOS requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onView && onView(request)}
                    title={`Click to view details for ${request.patient_name}`}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatDateTime(request.requested_at)}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {request.id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{request.patient_name}</div>
                        <div className="text-sm text-gray-500">{request.patient_email}</div>
                        <div className="table-cell-flex">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallPatient(request.patient_phone)
                            }}
                            className="h-6 px-2 text-blue-600 hover:text-blue-700"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            {request.patient_phone}
                          </Button>
                        </div>
                        {request.patient_details.blood_group && (
                          <Badge variant="outline" className="text-xs">
                            {request.patient_details.blood_group}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {showStatusColumn && (
                      <TableCell>
                        <div className="space-y-2">
                          <div className="table-cell-flex">
                            {getStatusBadge(request.status)}
                          </div>
                          {request.assigned_at && (
                            <div className="text-xs text-gray-500">
                              Assigned: {formatDateTime(request.assigned_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {request.assigned_driver ? (
                        <div className="space-y-1">
                          <div className="font-medium">{request.assigned_driver.name}</div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallPatient(request.assigned_driver!.phone)
                            }}
                            className="h-6 px-2 text-blue-600 hover:text-blue-700"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            {request.assigned_driver.phone}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">Not assigned</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.patient_details.emergency_contacts.length > 0 ? (
                        <div className="space-y-2">
                          {request.patient_details.emergency_contacts.slice(0, 2).map((contact, index) => (
                            <div key={contact.id} className="space-y-1">
                              <div className="font-medium text-sm">
                                {contact.name}
                                {request.patient_details.emergency_contacts.length > 1 && (
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    {index + 1}
                                  </Badge>
                                )}
                              </div>
                              {contact.relationship && (
                                <div className="text-xs text-gray-500">
                                  {contact.relationship}
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCallEmergencyContact(contact.phone)
                                }}
                                className="h-6 px-2 text-red-600 hover:text-red-700"
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                {contact.phone}
                              </Button>
                            </div>
                          ))}
                          {request.patient_details.emergency_contacts.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{request.patient_details.emergency_contacts.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : request.patient_details.emergency_contact_name ? (
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {request.patient_details.emergency_contact_name}
                            <Badge variant="outline" className="ml-1 text-xs">
                              Legacy
                            </Badge>
                          </div>

                          {request.patient_details.emergency_contact_phone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCallEmergencyContact(request.patient_details.emergency_contact_phone!)
                              }}
                              className="h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              {request.patient_details.emergency_contact_phone}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">No contacts</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="table-cell-actions">
                        {onView && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              onView(request)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onAssignDriver && !request.assigned_driver && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAssignDriver(request)
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(request)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(request)
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>

        {/* Page Size Selector and Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Show:</span>
              <Select value={limit.toString()} onValueChange={(value) => {
                setLimit(parseInt(value))
                setPage(1) // Reset to first page when changing page size
              }}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
