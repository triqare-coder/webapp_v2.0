'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Loader2,
  RefreshCw,
  Table,
  Grid3X3,
  Heart
} from 'lucide-react'
import { useHistoricalSOS, usePriorityColor, useStatusColor } from '@/hooks/useHistoricalSOS'
import { SOSHistoryDataTable } from '@/components/sos/SOSHistoryDataTable'

export default function SOSHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Arrived at Hospital' | 'Cancelled'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Fetch historical SOS data with filters
  const filters = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    dateRange: dateFilter as 'today' | 'week' | 'month' | 'quarter' | 'all',
    search: searchTerm.trim() || undefined,
    limit: 100 // Load up to 100 records
  }), [statusFilter, dateFilter, searchTerm])

  const { data: cases, loading, error, stats, refetch } = useHistoricalSOS(filters)
  const getPriorityColor = usePriorityColor()
  const getStatusColor = useStatusColor()

  // Helper function to calculate response time
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

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'transferred':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Handle loading and error states
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <History className="h-6 w-6 mr-2" />
            SOS Case History
          </h1>
          <p className="text-gray-600">Review completed and closed emergency cases</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading historical SOS cases...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <History className="h-6 w-6 mr-2" />
            SOS Case History
          </h1>
          <p className="text-gray-600">Review completed and closed emergency cases</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-medium mb-2 text-red-800">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <History className="h-6 w-6 mr-2" />
              SOS Case History
            </h1>
            <p className="text-gray-600">Review completed and closed emergency cases</p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
              >
                <Table className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Cards
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by patient name, case ID, or emergency type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'Arrived at Hospital' | 'Cancelled')}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Arrived at Hospital">Arrived at Hospital</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as 'all' | 'today' | 'week' | 'month' | 'quarter')}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cases Display */}
        {viewMode === 'table' ? (
          <SOSHistoryDataTable
            data={cases}
            loading={loading}
            onRefresh={refetch}
          />
        ) : (
          <div className="space-y-4">
            {cases.map((sosCase) => (
              <Card key={sosCase.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(sosCase.status)}>
                          {getStatusIcon(sosCase.status)}
                          <span className="ml-1">{sosCase.status.toUpperCase()}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">Case: SOS-{sosCase.id.slice(-8)}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {sosCase.patient?.full_name || 'Unknown Patient'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {sosCase.patient?.blood_group && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mr-2">
                                <Heart className="h-3 w-3 mr-1" />
                                {sosCase.patient.blood_group}
                              </Badge>
                            )}
                            {sosCase.patient?.phone && (
                              <span className="text-gray-500">📞 {sosCase.patient.phone}</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {sosCase.patient?.address_line || 'Location not available'}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">
                            <strong>Requested:</strong> {new Date(sosCase.requested_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Response Time:</strong> {calculateResponseTime(sosCase.requested_at, sosCase.assigned_at)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Completed:</strong> {sosCase.completed_at ? new Date(sosCase.completed_at).toLocaleString() : 'N/A'}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">
                            <strong>Driver:</strong> {sosCase.assigned_driver?.full_name || 'Not assigned'}
                          </p>
                          {sosCase.assigned_driver?.phone && (
                            <p className="text-sm text-gray-600">
                              <strong>Driver Phone:</strong> {sosCase.assigned_driver.phone}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            <strong>Auto Assigned:</strong> {sosCase.auto_assigned ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>

                      {/* Emergency Contact Information */}
                      {sosCase.patient?.emergency_contact_name && (
                        <div className="pt-3 border-t">
                          <p className="text-sm text-gray-600">
                            <strong>Emergency Contact:</strong> {sosCase.patient.emergency_contact_name}
                            {sosCase.patient.emergency_contact_phone && (
                              <span className="ml-2">📞 {sosCase.patient.emergency_contact_phone}</span>
                            )}

                          </p>
                        </div>
                      )}

                      {/* Medical Information */}
                      {sosCase.patient?.allergies && (
                        <div className="pt-2">
                          <p className="text-sm text-red-600">
                            <strong>⚠️ Allergies:</strong> {sosCase.patient.allergies}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        title="View Details"
                        onClick={() => window.open(`/erteam/sos/history/${sosCase.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" title="Export Case">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {cases.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No historical cases found</h3>
                <p>No completed, cancelled, or transferred SOS cases match your current filters.</p>
                <Button
                  onClick={refetch}
                  variant="outline"
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  )
}
