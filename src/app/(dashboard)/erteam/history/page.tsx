'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  History, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Filter
} from 'lucide-react'

interface EmergencyHistory {
  id: string
  caseId: string
  type: 'medical' | 'accident' | 'fire' | 'rescue'
  priority: 'high' | 'medium' | 'low'
  status: 'completed' | 'cancelled' | 'transferred'
  patientName: string
  location: string
  responseTime: string
  completionTime: string
  assignedVehicle: string
  assignedDriver: string
  outcome: string
  date: string
  notes: string
}

export default function ERTHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState('month')

  const [emergencyHistory] = useState<EmergencyHistory[]>([
    {
      id: '1',
      caseId: 'ERT-2024-001',
      type: 'medical',
      priority: 'high',
      status: 'completed',
      patientName: 'John Smith',
      location: '123 Main St, Downtown',
      responseTime: '4 min 32 sec',
      completionTime: '45 min',
      assignedVehicle: 'AMB-001',
      assignedDriver: 'Mike Johnson',
      outcome: 'Patient stabilized and transported to General Hospital',
      date: '2024-01-15 14:30',
      notes: 'Cardiac emergency, patient responded well to treatment'
    },
    {
      id: '2',
      caseId: 'ERT-2024-002',
      type: 'accident',
      priority: 'high',
      status: 'completed',
      patientName: 'Sarah Davis',
      location: '456 Oak Ave, Highway 101',
      responseTime: '6 min 15 sec',
      completionTime: '1 hr 20 min',
      assignedVehicle: 'AMB-002',
      assignedDriver: 'Lisa Chen',
      outcome: 'Multiple injuries treated, transported to Trauma Center',
      date: '2024-01-14 09:45',
      notes: 'Multi-vehicle accident, coordinated with fire department'
    },
    {
      id: '3',
      caseId: 'ERT-2024-003',
      type: 'medical',
      priority: 'medium',
      status: 'transferred',
      patientName: 'Robert Wilson',
      location: '789 Pine St, Residential Area',
      responseTime: '8 min 45 sec',
      completionTime: '25 min',
      assignedVehicle: 'AMB-003',
      assignedDriver: 'David Brown',
      outcome: 'Patient transferred to specialized facility',
      date: '2024-01-13 16:20',
      notes: 'Required specialized cardiac care, transferred to Heart Institute'
    },
    {
      id: '4',
      caseId: 'ERT-2024-004',
      type: 'rescue',
      priority: 'high',
      status: 'completed',
      patientName: 'Emily Johnson',
      location: '321 River Rd, Industrial District',
      responseTime: '12 min 30 sec',
      completionTime: '2 hr 15 min',
      assignedVehicle: 'RES-001',
      assignedDriver: 'Tom Wilson',
      outcome: 'Successful rescue from confined space',
      date: '2024-01-12 11:15',
      notes: 'Industrial accident, coordinated with hazmat team'
    },
    {
      id: '5',
      caseId: 'ERT-2024-005',
      type: 'fire',
      priority: 'high',
      status: 'cancelled',
      patientName: 'Michael Brown',
      location: '654 Elm St, Commercial Area',
      responseTime: 'N/A',
      completionTime: 'N/A',
      assignedVehicle: 'AMB-004',
      assignedDriver: 'Anna Martinez',
      outcome: 'False alarm - cancelled en route',
      date: '2024-01-11 20:30',
      notes: 'Smoke alarm malfunction, no emergency present'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'transferred':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'transferred':
        return <AlertTriangle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medical':
        return 'bg-blue-100 text-blue-800'
      case 'accident':
        return 'bg-red-100 text-red-800'
      case 'fire':
        return 'bg-orange-100 text-orange-800'
      case 'rescue':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredHistory = emergencyHistory.filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assignedDriver.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const completedCases = emergencyHistory.filter(h => h.status === 'completed').length
  const totalCases = emergencyHistory.length
  const avgResponseTime = '6 min 45 sec' // This would be calculated from actual data
  const successRate = Math.round((completedCases / totalCases) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <History className="h-6 w-6 mr-2" />
            Emergency Response History
          </h1>
          <p className="text-gray-600">Review past emergency responses and outcomes</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{totalCases}</p>
              </div>
              <History className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedCases}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-blue-600">{avgResponseTime}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{successRate}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-600" />
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
                  placeholder="Search by case ID, patient name, location, or driver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="rescue">Rescue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Badge className={getTypeColor(item.type)}>
                      {item.type}
                    </Badge>
                    <Badge className={getStatusColor(item.status)}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1">{item.status}</span>
                    </Badge>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                    <span className="text-sm text-gray-500">{item.caseId}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.patientName}</h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {item.location}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(item.date).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <strong>Response:</strong> {item.responseTime}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <strong>Duration:</strong> {item.completionTime}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 mr-2" />
                          <strong>Vehicle:</strong> {item.assignedVehicle}
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          <strong>Driver:</strong> {item.assignedDriver}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-600">
                      <strong>Outcome:</strong> {item.outcome}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Notes:</strong> {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredHistory.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No emergency history found</h3>
              <p>Try adjusting your search criteria or filters.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
