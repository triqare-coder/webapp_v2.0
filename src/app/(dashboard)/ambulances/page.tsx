'use client'

import { useState } from 'react'
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
import { mockAmbulances, mockDrivers, mockTransportCompanies } from '@/lib/mock-data'
import { getStatusColor, capitalizeFirst } from '@/lib/utils'
import { Search, Plus, Edit, Eye, MapPin, Truck, Settings } from 'lucide-react'

export default function AmbulancesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [ambulances] = useState(mockAmbulances)

  const filteredAmbulances = ambulances.filter(ambulance =>
    ambulance.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ambulance.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ambulance.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDriver = (driverId: string | undefined) => {
    return driverId ? mockDrivers.find(d => d.id === driverId) : null
  }

  const getTransportCompany = (companyId: string) => {
    return mockTransportCompanies.find(c => c.id === companyId)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ambulance Fleet Management</h1>
          <p className="text-gray-600">Monitor and manage ambulance fleet operations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Ambulance
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Ambulances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by vehicle number, type, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter by Status</Button>
            <Button variant="outline">Filter by Type</Button>
          </div>
        </CardContent>
      </Card>

      {/* Ambulances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ambulance Fleet ({filteredAmbulances.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Transport Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAmbulances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No ambulances found matching your search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAmbulances.map((ambulance) => {
                    const driver = getDriver(ambulance.driverId)
                    const company = getTransportCompany(ambulance.transportCompanyId)
                    
                    return (
                      <TableRow key={ambulance.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-2 text-blue-600" />
                            <div>
                              <div className="font-semibold">{ambulance.vehicleNumber}</div>
                              <div className="text-sm text-gray-500">ID: {ambulance.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {ambulance.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ambulance.status)}>
                            {capitalizeFirst(ambulance.status.replace('_', ' '))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {driver ? (
                            <div>
                              <div className="font-medium">{driver.firstName} {driver.lastName}</div>
                              <div className="text-sm text-gray-500">{driver.phoneNumber}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{company?.name}</div>
                            <div className="text-gray-500">{company?.phoneNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                            <span>
                              {ambulance.currentLocation.lat.toFixed(4)}, {ambulance.currentLocation.lng.toFixed(4)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ambulance.equipment.slice(0, 2).map((item, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                            {ambulance.equipment.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{ambulance.equipment.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="sm">
                              <MapPin className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ambulances</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ambulances.length}</div>
            <p className="text-xs text-muted-foreground">
              In the fleet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {ambulances.filter(a => a.status === 'available').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for dispatch
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {ambulances.filter(a => a.status === 'dispatched').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently responding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {ambulances.filter(a => a.status === 'maintenance').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Under maintenance
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
