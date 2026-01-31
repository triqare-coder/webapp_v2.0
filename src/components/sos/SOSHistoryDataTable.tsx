'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Eye, 
  Download, 
  Phone, 
  MapPin,
  Clock,
  User,
  Truck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { SOSRequest } from '@/services/sosService'
import { useStatusColor } from '@/hooks/useHistoricalSOS'

interface SOSHistoryDataTableProps {
  data: SOSRequest[]
  loading: boolean
  onRefresh?: () => void
}

type SortField = 'requested_at' | 'patient_name' | 'status' | 'assigned_at' | 'completed_at'
type SortDirection = 'asc' | 'desc'

export function SOSHistoryDataTable({ data, loading, onRefresh }: SOSHistoryDataTableProps) {
  const router = useRouter()
  const getStatusColor = useStatusColor()
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortField, setSortField] = useState<SortField>('requested_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'patient_name':
          aValue = a.patient?.full_name || ''
          bValue = b.patient?.full_name || ''
          break
        case 'requested_at':
          aValue = new Date(a.requested_at).getTime()
          bValue = new Date(b.requested_at).getTime()
          break
        case 'assigned_at':
          aValue = a.assigned_at ? new Date(a.assigned_at).getTime() : 0
          bValue = b.assigned_at ? new Date(b.assigned_at).getTime() : 0
          break
        case 'completed_at':
          aValue = a.completed_at ? new Date(a.completed_at).getTime() : 0
          bValue = b.completed_at ? new Date(b.completed_at).getTime() : 0
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          aValue = a.requested_at
          bValue = b.requested_at
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [data, sortField, sortDirection])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedData.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '✅'
      case 'cancelled':
        return '❌'
      case 'transferred':
        return '🔄'
      default:
        return '⏳'
    }
  }

  const calculateResponseTime = (requestedAt: string, assignedAt?: string) => {
    if (!assignedAt) return 'N/A'
    
    const requested = new Date(requestedAt).getTime()
    const assigned = new Date(assignedAt).getTime()
    const diffMs = assigned - requested
    
    if (diffMs <= 0) return '00:00'
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const handleViewDetails = (sosCase: SOSRequest) => {
    router.push(`/erteam/sos/history/${sosCase.id}`)
  }

  const handleExport = (sosCase: SOSRequest) => {
    // TODO: Implement export functionality
    console.log('Export case:', sosCase.id)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Historical SOS Cases ({sortedData.length})</span>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 w-[180px]"
                  onClick={() => handleSort('requested_at')}
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Requested</span>
                    {getSortIcon('requested_at')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 min-w-[200px]"
                  onClick={() => handleSort('patient_name')}
                >
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Patient</span>
                    {getSortIcon('patient_name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 w-[120px]"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex items-center space-x-1">
                    <Truck className="h-4 w-4" />
                    <span>Driver</span>
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">Response Time</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 w-[150px]"
                  onClick={() => handleSort('completed_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Completed</span>
                    {getSortIcon('completed_at')}
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No historical SOS cases found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((sosCase) => (
                  <TableRow key={sosCase.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Date(sosCase.requested_at).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                          {new Date(sosCase.requested_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {sosCase.patient?.full_name || 'Unknown'}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {sosCase.patient?.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {sosCase.patient.phone}
                            </div>
                          )}
                          {sosCase.patient?.blood_group && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {sosCase.patient.blood_group}
                            </Badge>
                          )}
                        </div>
                        {sosCase.patient?.address_line && (
                          <div className="flex items-center text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[150px]">
                              {sosCase.patient.address_line}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(sosCase.status)}>
                        <span className="mr-1">{getStatusIcon(sosCase.status)}</span>
                        {sosCase.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sosCase.assigned_driver ? (
                          <div>
                            <div className="font-medium">
                              {sosCase.assigned_driver.full_name}
                            </div>
                            {sosCase.assigned_driver.phone && (
                              <div className="text-gray-500 text-xs">
                                {sosCase.assigned_driver.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Not assigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {calculateResponseTime(sosCase.requested_at, sosCase.assigned_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sosCase.completed_at ? (
                          <>
                            <div>{new Date(sosCase.completed_at).toLocaleDateString()}</div>
                            <div className="text-gray-500">
                              {new Date(sosCase.completed_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(sosCase)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(sosCase)}
                          className="h-8 w-8 p-0"
                          title="Export Case"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Items per page selector */}
        <div className="flex items-center justify-end mt-2">
          <div className="flex items-center space-x-2 text-sm">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-gray-300 rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
