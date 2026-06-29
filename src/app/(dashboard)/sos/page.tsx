'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SOSService, type SOSRequest } from '@/services/sosService'
import { formatDateTime, getSeverityColor, getStatusColor } from '@/lib/utils'
import { toast } from 'sonner'
import { useSOSRequestsRealtime } from '@/hooks/useSOSRequestsRealtime'
import {
  Search,
  Plus,
  MapPin,
  Clock,
  Phone,
  Truck,
  Eye,
  User,
  Building2,
  AlertTriangle,
  Navigation,
  Zap
} from 'lucide-react'

export default function SOSPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [isCreatingTestSOS, setIsCreatingTestSOS] = useState(false)

  // Use realtime hook for SOS requests
  const { sosRequests: sosCases, loading, error: sosError, refetch, isConnected } = useSOSRequestsRealtime({
    enabled: true,
    playAlertSound: true,
    onInsert: (sos) => {
      toast.error(`🚨 NEW EMERGENCY!`, {
        duration: 10000,
        description: `Emergency from ${sos.patient?.full_name || 'Unknown Patient'}`
      })
    }
  })

  // Load patients for test SOS creation
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch('/api/sos/patients')
        const result = await response.json()

        if (response.ok && result.data) {
          setPatients(result.data)
        } else {
          console.error('Failed to load patients:', result.error)
        }
      } catch (error) {
        console.error('Error loading patients:', error)
      }
    }

    loadPatients()
  }, [])

  // Create test SOS request
  const createTestSOS = async () => {
    if (patients.length === 0) {
      toast.error('No patients available for test SOS creation')
      return
    }

    setIsCreatingTestSOS(true)

    try {
      // Select a random patient
      const randomPatient = patients[Math.floor(Math.random() * patients.length)]

      const response = await fetch('/api/sos-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: randomPatient.user_id,
          auto_assigned: true,
          status: 'SOS Triggered'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Test SOS request created for ${randomPatient.full_name}!`)
        // Realtime hook will automatically update the UI
        refetch()
      } else {
        toast.error(result.error || 'Failed to create test SOS request')
      }
    } catch (error) {
      console.error('Error creating test SOS:', error)
      toast.error('Failed to create test SOS request')
    } finally {
      setIsCreatingTestSOS(false)
    }
  }

  const filteredCases = sosCases.filter(case_ =>
    case_.patient?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.id.toLowerCase().includes(searchTerm.toLowerCase())
  )



  const activeCases = filteredCases.filter(c => c.status !== 'Arrived at Hospital' && c.status !== 'Cancelled')
  const pendingCases = filteredCases.filter(c => c.status === 'SOS Triggered')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">SOS Emergency Dashboard</h1>
            {/* Realtime Connection Status */}
            {isConnected && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
            {!isConnected && !loading && (
              <Badge variant="secondary" className="bg-red-100 text-red-600">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2" />
                Offline
              </Badge>
            )}
          </div>
          <p className="text-gray-600">Monitor and respond to emergency situations</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={createTestSOS}
            disabled={isCreatingTestSOS || patients.length === 0}
            className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isCreatingTestSOS ? 'Creating...' : 'Test SOS'}
          </Button>
          <Button variant="outline">
            <MapPin className="h-4 w-4 mr-2" />
            Live Map View
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Emergency
          </Button>
        </div>
      </div>

      {/* Emergency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Emergencies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeCases.length}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assignment</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCases.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting ambulance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases Today</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sosCases.length}</div>
            <p className="text-xs text-muted-foreground">All emergency calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Navigation className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              --
            </div>
            <p className="text-xs text-muted-foreground">Response time tracking</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Emergency Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by patient name, email, status, or case ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline">Filter by Status</Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            Emergency Cases
            <span className="rounded-full bg-[#ccd9e6]/60 px-2.5 py-0.5 text-xs font-semibold text-[#003366]">{filteredCases.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patient</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Case ID</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assigned Driver</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Time</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                      No emergency cases found matching your search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((case_) => (
                      <TableRow key={case_.id} className="hover:bg-slate-50/70">
                        <TableCell>
                          <div>
                            <div className="font-semibold text-[#003366]">
                              {case_.patient?.full_name || 'Unknown Patient'}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {case_.patient?.phone || case_.patient?.email || 'No contact'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-xs text-gray-500">Case #{case_.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(case_.status)}>
                            {case_.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {case_.assigned_driver ? (
                              <div className="flex items-center text-xs">
                                <User className="h-3 w-3 mr-1 text-[#003366]" />
                                <span>{case_.assigned_driver.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-gray-400" />
                              {formatDateTime(new Date(case_.requested_at))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {case_.status === 'SOS Triggered' && (
                              <Button size="sm" variant="default">
                                <Truck className="h-3 w-3 mr-1" />
                                Assign
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/sos/${case_.id}`}>
                                <Eye className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
