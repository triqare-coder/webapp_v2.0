'use client'

import { useState, useEffect, useMemo } from 'react'
import DataTable, { TableColumn } from 'react-data-table-component'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SOSRequest } from '@/services/sosService'
import { SOSRequestService } from '@/services/sosRequestService'
import { formatDateTime } from '@/lib/utils'
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Phone,
  Clock,
  Building2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface SOSDataTableProps {
  onView?: (sosRequest: SOSRequest) => void
  onEdit?: (sosRequest: SOSRequest) => void
  onDelete?: (sosRequest: SOSRequest) => void
  refreshTrigger?: number
}

export function SOSDataTable({ onView, onEdit, onDelete, refreshTrigger }: SOSDataTableProps) {
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalRows, setTotalRows] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch SOS requests
  const fetchSOSRequests = async (page = 1, limit = 10, search = '', status = 'all') => {
    setLoading(true)
    try {
      const filters = {
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        limit,
        offset: (page - 1) * limit
      }

      const data = await SOSRequestService.getAll()

      setSOSRequests((data || []) as SOSRequest[])
      setTotalRows(data?.length || 0)
    } catch (error) {
      console.error('Error fetching SOS requests:', error)
      toast.error('Failed to fetch SOS requests')
    } finally {
      setLoading(false)
    }
  }

  // Initial load and refresh trigger
  useEffect(() => {
    fetchSOSRequests(currentPage, perPage, searchTerm, statusFilter)
  }, [refreshTrigger, currentPage, perPage, searchTerm, statusFilter])

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    fetchSOSRequests(1, perPage, value, statusFilter)
  }

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
    fetchSOSRequests(1, perPage, searchTerm, value)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchSOSRequests(page, perPage, searchTerm, statusFilter)
  }

  const handlePerRowsChange = (newPerPage: number, page: number) => {
    setPerPage(newPerPage)
    setCurrentPage(page)
    fetchSOSRequests(page, newPerPage, searchTerm, statusFilter)
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'accepted': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Define columns
  const columns: TableColumn<SOSRequest>[] = useMemo(() => [
    {
      name: 'Patient',
      selector: (row) => row.patient?.full_name || 'Unknown',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <div className="font-medium text-sm">
            {row.patient?.full_name || 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 flex items-center">
            <Phone className="h-3 w-3 mr-1" />
            {row.patient?.phone || 'N/A'}
          </div>
        </div>
      ),
      width: '200px'
    },
    {
      name: 'Status',
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <Badge className={getStatusColor(row.status)}>
          {row.status.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
      width: '120px'
    },
    {
      name: 'Driver',
      selector: (row) => row.assigned_driver?.full_name || 'Unassigned',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            {row.assigned_driver?.full_name || 'Unassigned'}
          </div>
          {row.assigned_driver?.phone && (
            <div className="text-xs text-gray-500 flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              {row.assigned_driver.phone}
            </div>
          )}
          {row.assigned_driver && (
            <div className="text-xs text-blue-600 flex items-center">
              <span className="mr-1">🚗</span>
              Driver Assigned
            </div>
          )}
        </div>
      ),
      width: '180px'
    },
    {
      name: 'Requested At',
      selector: (row) => row.requested_at || '',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center text-sm">
          <Clock className="h-3 w-3 mr-1 text-gray-400" />
          {row.requested_at ? formatDateTime(new Date(row.requested_at)) : 'N/A'}
        </div>
      ),
      width: '160px'
    },
    {
      name: 'Auto Assigned',
      selector: (row) => row.auto_assigned ? 'Yes' : 'No',
      sortable: true,
      cell: (row) => (
        <Badge variant={row.auto_assigned ? 'default' : 'secondary'}>
          {row.auto_assigned ? 'Auto' : 'Manual'}
        </Badge>
      ),
      width: '120px'
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(row)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(row)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      width: '120px'
    }
  ], [onView, onEdit, onDelete])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>SOS Requests ({totalRows})</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSOSRequests(currentPage, perPage, searchTerm, statusFilter)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by patient name, email, or status..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={sosRequests}
          progressPending={loading}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          paginationDefaultPage={currentPage}
          paginationPerPage={perPage}
          onChangeRowsPerPage={handlePerRowsChange}
          onChangePage={handlePageChange}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          highlightOnHover
          pointerOnHover
          responsive
          striped
          customStyles={{
            headRow: {
              style: {
                backgroundColor: '#f8fafc',
                borderBottomColor: '#e2e8f0',
                borderBottomWidth: '1px',
                minHeight: '52px'
              }
            },
            headCells: {
              style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                paddingLeft: '16px',
                paddingRight: '16px'
              }
            },
            cells: {
              style: {
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '12px',
                paddingBottom: '12px'
              }
            }
          }}
        />
      </CardContent>
    </Card>
  )
}
