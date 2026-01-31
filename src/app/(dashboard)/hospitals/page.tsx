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
import { mockHospitals } from '@/lib/mock-data'
import { formatPhoneNumber } from '@/lib/utils'
import { Search, Plus, Edit, Eye, MapPin, Phone, Mail } from 'lucide-react'

export default function HospitalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [hospitals] = useState(mockHospitals)

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.address_line.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.hospital_type.toLowerCase().includes(searchTerm.toLowerCase())
  )



  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hospitals Management</h1>
          <p className="text-gray-600">Manage hospital network and capacity</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Hospital
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Hospitals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, address, or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter by Type</Button>
            <Button variant="outline">Filter by Status</Button>
          </div>
        </CardContent>
      </Card>

      {/* Hospitals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hospitals List ({filteredHospitals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHospitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No hospitals found matching your search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHospitals.map((hospital) => (
                    <TableRow key={hospital.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{hospital.name}</div>
                          <div className="text-sm text-gray-500">ID: {hospital.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {formatPhoneNumber(hospital.phone)}
                          </div>
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {hospital.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-400" />
                          <span className="text-sm">{hospital.address_line}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {hospital.hospital_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hospital.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {hospital.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hospitals.length}</div>
            <p className="text-xs text-muted-foreground">
              In the network
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Hospitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hospitals.filter(h => h.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Government Hospitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hospitals.filter(h => h.hospital_type === 'government').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Public healthcare facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private Hospitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {hospitals.filter(h => h.hospital_type === 'private').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Private healthcare facilities
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
