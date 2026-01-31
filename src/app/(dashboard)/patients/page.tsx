'use client'

import { useState, useMemo } from 'react'
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
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { mockPatients } from '@/lib/mock-data'
import { formatDate, formatPhoneNumber, calculateAge } from '@/lib/utils'
import { Search, Plus, Edit, Eye } from 'lucide-react'

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients] = useState(mockPatients)

  const filteredPatients = useMemo(() => {
    return patients.filter(patient =>
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phoneNumber.includes(searchTerm) ||
      patient.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [patients, searchTerm])

  // Setup pagination
  const pagination = usePagination(filteredPatients, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patients Management</h1>
          <p className="text-gray-600">Manage patient records and information</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patients List ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Medical History</TableHead>
                  <TableHead>Emergency Contact</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No patients found matching your search criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.currentPageData.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {patient.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPhoneNumber(patient.phoneNumber)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {patient.address}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {patient.medicalHistory ? (
                          <span className="text-sm text-gray-600 truncate block">
                            {patient.medicalHistory}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">None recorded</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{patient.emergencyContact.name}</div>
                          <div className="text-gray-600">
                            {patient.emergencyContact.relationship}
                          </div>
                          <div className="text-gray-500">
                            {formatPhoneNumber(patient.emergencyContact.phoneNumber)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(patient.createdAt)}</TableCell>
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

          {/* Pagination */}
          {filteredPatients.length > 0 && (
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.filter(p => p.medicalHistory).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Have recorded medical conditions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">
              All patients have emergency contacts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
