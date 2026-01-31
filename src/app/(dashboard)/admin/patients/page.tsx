'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PaginationWithInfo } from '@/components/ui/pagination'
import { usePatients, usePatientStats, useDeletePatient } from '@/hooks/usePatients'
import { useHospitals } from '@/hooks/useHospitals'
import { useCountries, useStates, useCities } from '@/hooks/useLocations'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Activity,
  Heart,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function AdminPatientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('')
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('')
  const [hospitalFilter, setHospitalFilter] = useState<string>('')
  const [countryFilter, setCountryFilter] = useState<string>('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [cityFilter, setCityFilter] = useState<string>('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<any>(null)

  // CSV Import state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Database hooks
  const { patients, loading: patientsLoading, error: patientsError, count, refetch } = usePatients({
    search: searchQuery,
    gender: genderFilter || undefined,
    blood_group: bloodGroupFilter || undefined,
    primary_hospital_id: hospitalFilter || undefined,
    country_id: countryFilter || undefined,
    state_id: stateFilter || undefined,
    city_id: cityFilter || undefined,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage
  })

  const { stats, loading: statsLoading } = usePatientStats()
  const { hospitals } = useHospitals()
  const { countries } = useCountries()
  const { states } = useStates(countryFilter || undefined)
  const { cities } = useCities(stateFilter || undefined)
  const { deletePatient, loading: deleteLoading } = useDeletePatient()

  // Reset dependent filters when parent changes
  const handleCountryChange = (value: string) => {
    setCountryFilter(value)
    setStateFilter('')
    setCityFilter('')
  }

  const handleStateChange = (value: string) => {
    setStateFilter(value)
    setCityFilter('')
  }

  // Calculate total pages
  const totalPages = Math.ceil((count || 0) / itemsPerPage)

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Utility functions
  const getBloodGroupColor = (bloodGroup: string) => {
    const colors = ['bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800']
    return colors[bloodGroup?.charCodeAt(0) % colors.length] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Delete handlers
  const handleDeleteClick = (patient: any) => {
    setPatientToDelete(patient)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return

    try {
      const success = await deletePatient(patientToDelete.user_id)
      if (success) {
        toast.success('Patient deleted successfully')
        setDeleteDialogOpen(false)
        setPatientToDelete(null)
        refetch() // Refresh the patient list
      } else {
        toast.error('Failed to delete patient')
      }
    } catch (error) {
      console.error('Error deleting patient:', error)
      toast.error('Failed to delete patient')
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setPatientToDelete(null)
  }

  // CSV Import handlers
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setCsvFile(file)
      setCsvResult(null)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return

    setCsvUploading(true)
    setCsvResult(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)

      const response = await fetch('/api/patients/upload-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setCsvResult({ success: result.success, failed: result.failed, errors: result.errors || [] })
        if (result.success > 0) {
          toast.success(`Successfully imported ${result.success} patients`)
          refetch()
        }
        if (result.failed > 0) {
          toast.warning(`${result.failed} records failed to import`)
        }
      } else {
        toast.error(result.error || 'Upload failed')
        setCsvResult({ success: 0, failed: 0, errors: [result.error] })
      }
    } catch (error) {
      toast.error('Failed to upload CSV')
      setCsvResult({ success: 0, failed: 0, errors: ['Network error'] })
    } finally {
      setCsvUploading(false)
    }
  }

  const handleCsvDialogClose = () => {
    setCsvDialogOpen(false)
    setCsvFile(null)
    setCsvResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const headers = 'full_name,email,phone,dob,gender,blood_group,allergies,abha_id,insurance_provider,insurance_policy_number,insurance_valid_till,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,latitude,longitude,address_line,country_name,state_name,city_name,pincode'
    const sampleRow = 'John Doe,john.patient@example.com,9876543210,15-01-1990,Male,O+,Penicillin,ABHA12345,Star Health,POL123456,31-12-2025,Jane Doe,9876543211,Spouse,12.9716,77.5946,"123 Main Street",India,Kerala,Kochi,682001'
    const csv = headers + '\n' + sampleRow

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'patients_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Loading state
  if (patientsLoading && !patients) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading patients...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (patientsError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span>Error loading patients: {patientsError}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Patients Management</h1>
          <p className="text-gray-600">Manage patient records and information</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Link href="/admin/patients/add">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Registered patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Gender</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {statsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                Object.entries(stats?.byGender || {}).map(([gender, count]) => (
                  <div key={gender} className="flex justify-between">
                    <span>{gender}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blood Groups</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {statsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                Object.entries(stats?.byBloodGroup || {}).slice(0, 3).map(([bloodGroup, count]) => (
                  <div key={bloodGroup} className="flex justify-between">
                    <span>{bloodGroup}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patients by name, email, or ABHA ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Combobox
              options={[
                { value: "", label: "All Genders" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" }
              ]}
              value={genderFilter}
              onValueChange={setGenderFilter}
              placeholder="All Genders"
              searchPlaceholder="Search gender..."
            />
            <Combobox
              options={[
                { value: "", label: "All Blood Groups" },
                { value: "A+", label: "A+" },
                { value: "A-", label: "A-" },
                { value: "B+", label: "B+" },
                { value: "B-", label: "B-" },
                { value: "O+", label: "O+" },
                { value: "O-", label: "O-" },
                { value: "AB+", label: "AB+" },
                { value: "AB-", label: "AB-" }
              ]}
              value={bloodGroupFilter}
              onValueChange={setBloodGroupFilter}
              placeholder="All Blood Groups"
              searchPlaceholder="Search blood group..."
            />
            <Combobox
              options={[
                { value: "", label: "All Hospitals" },
                ...(hospitals?.map((hospital): ComboboxOption => ({
                  value: hospital.id,
                  label: hospital.name
                })) || [])
              ]}
              value={hospitalFilter}
              onValueChange={setHospitalFilter}
              placeholder="All Hospitals"
              searchPlaceholder="Search hospitals..."
              emptyText="No hospitals found."
            />
            <Combobox
              options={[
                { value: "", label: "All Countries" },
                ...(countries?.map((country): ComboboxOption => ({
                  value: country.id,
                  label: country.name
                })) || [])
              ]}
              value={countryFilter}
              onValueChange={handleCountryChange}
              placeholder="All Countries"
              searchPlaceholder="Search countries..."
              emptyText="No countries found."
            />
            <Combobox
              options={[
                { value: "", label: "All States" },
                ...(states?.map((state): ComboboxOption => ({
                  value: state.id,
                  label: state.name
                })) || [])
              ]}
              value={stateFilter}
              onValueChange={handleStateChange}
              disabled={!countryFilter}
              placeholder="All States"
              searchPlaceholder="Search states..."
              emptyText="No states found."
            />
            <Combobox
              options={[
                { value: "", label: "All Cities" },
                ...(cities?.map((city): ComboboxOption => ({
                  value: city.id,
                  label: city.name
                })) || [])
              ]}
              value={cityFilter}
              onValueChange={setCityFilter}
              disabled={!stateFilter}
              placeholder="All Cities"
              searchPlaceholder="Search cities..."
              emptyText="No cities found."
            />
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setGenderFilter('')
                setBloodGroupFilter('')
                setHospitalFilter('')
                setCountryFilter('')
                setStateFilter('')
                setCityFilter('')
              }}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patients List ({count || 0} total)
            </span>
            {patientsLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patients && patients.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Info</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Medical Info</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.user_id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{patient.full_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">
                            Age: {calculateAge(patient.dob || '')} • {patient.gender || 'N/A'}
                          </div>
                          {patient.abha_id && (
                            <div className="text-xs text-blue-600">ABHA: {patient.abha_id}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {patient.email || 'N/A'}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Users className="h-3 w-3 mr-1" />
                            {patient.emergency_contacts_count || 0} Emergency Contact{(patient.emergency_contacts_count || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.blood_group && (
                            <Badge className={getBloodGroupColor(patient.blood_group)}>
                              {patient.blood_group}
                            </Badge>
                          )}
                          {patient.allergies && (
                            <div className="text-xs text-red-600">
                              Allergies: {patient.allergies.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {patient.city_name || 'N/A'}, {patient.state_name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {patient.country_name || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.primary_hospital_name || 'No primary hospital'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/admin/patients/${patient.user_id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/admin/patients/${patient.user_id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(patient)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <PaginationWithInfo
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                hasNextPage={currentPage < totalPages}
                hasPreviousPage={currentPage > 1}
                startIndex={(currentPage - 1) * itemsPerPage + 1}
                endIndex={Math.min(currentPage * itemsPerPage, count || 0)}
                totalItems={count || 0}
                pageSize={itemsPerPage}
                pageSizeOptions={[5, 10, 20, 50, 100]}
                onPageSizeChange={handleItemsPerPageChange}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || genderFilter || bloodGroupFilter || hospitalFilter || countryFilter
                  ? 'No patients match your current filters.'
                  : 'Get started by adding your first patient.'}
              </p>
              <Link href="/admin/patients/add">
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Patient
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{patientToDelete?.full_name}</strong>?
              This action cannot be undone and will also delete all associated emergency contacts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Patient
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={handleCsvDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Patients from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import patients. Download the template for the correct format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCsvFileChange}
                disabled={csvUploading}
              />
              {csvFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {csvFile.name}
                </p>
              )}
            </div>

            {csvResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{csvResult.success} imported</span>
                  </div>
                  {csvResult.failed > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{csvResult.failed} failed</span>
                    </div>
                  )}
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    {csvResult.errors.slice(0, 5).map((error, i) => (
                      <p key={i} className="text-xs text-red-600">{error}</p>
                    ))}
                    {csvResult.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {csvResult.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCsvDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleCsvUpload} disabled={!csvFile || csvUploading}>
              {csvUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
