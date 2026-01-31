'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Filter,
  X,
  Globe,
  Upload,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { useAllLocations } from '@/hooks/useLocations'
import { useStateManagement } from '@/hooks/useLocationManagement'
import { usePagination } from '@/hooks/usePagination'
import { PaginationWithInfo } from '@/components/ui/pagination'

export default function StatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [stateToDelete, setStateToDelete] = useState<{ id: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const { states, countries, loading, error, refetch } = useAllLocations()
  const { deleteState, loading: deleteLoading } = useStateManagement()

  // Create a map of country names for display
  const countryMap = useMemo(() => {
    if (!countries) return {}
    return countries.reduce((acc, country) => {
      acc[country.id] = country.name
      return acc
    }, {} as Record<string, string>)
  }, [countries])

  // Filter states based on search
  const filteredStates = useMemo(() => {
    if (!states) return []
    
    return states.filter(state =>
      state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      countryMap[state.country_id]?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [states, searchTerm, countryMap])

  // Pagination
  const {
    currentPageData: currentStates,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    goToPage,
    setPageSize,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination(filteredStates || [])

  const handleDeleteClick = (state: { id: string; name: string }) => {
    setStateToDelete(state)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!stateToDelete) return

    const result = await deleteState(stateToDelete.id)
    if (result.success) {
      refetch()
      setDeleteDialogOpen(false)
      setStateToDelete(null)
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
  }

  const downloadTemplate = () => {
    const headers = 'name,country_name'
    const sampleRows = [
      'Kerala,India',
      'Karnataka,India',
      'Tamil Nadu,India',
      'Maharashtra,India',
      'Gujarat,India',
      'California,United States',
      'Texas,United States',
      'New York,United States'
    ]
    const csv = headers + '\n' + sampleRows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'states_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportData = () => {
    if (!states || states.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = 'name,country_name'
    const rows = states.map(state => {
      const countryName = countryMap[state.country_id] || 'Unknown'
      return `${state.name},${countryName}`
    })
    const csv = headers + '\n' + rows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `states_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${states.length} states`)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/locations/states/upload-csv', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(result.message)
        if (result.results.errors.length > 0) {
          console.log('Upload errors:', result.results.errors)
          toast.info(`${result.results.errors.length} errors occurred. Check console for details.`)
        }
        refetch()
      } else {
        toast.error(result.error || 'Failed to upload CSV')
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      toast.error('Failed to upload CSV file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">States</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading states...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">States</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading states: {error}</p>
              <Button onClick={refetch} className="mt-4">
                Try Again
              </Button>
            </div>
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
          <h1 className="text-3xl font-bold">States</h1>
          <p className="text-gray-600">Manage states in the system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Link href="/admin/master-data/states/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add State
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total States</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{states?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              States in system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Countries with states
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search states or countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* States Table */}
      <Card>
        <CardHeader>
          <CardTitle>States ({filteredStates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStates.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No states found matching your search.' : 'No states found.'}
              </p>
              {!searchTerm && (
                <Link href="/admin/master-data/states/add">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First State
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentStates.map((state) => (
                    <TableRow key={state.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                          {state.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-green-600" />
                          {countryMap[state.country_id] || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {state.id}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/master-data/states/${state.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/master-data/states/${state.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(state)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <PaginationWithInfo
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    totalItems={totalItems}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    pageSizeOptions={[10, 25, 50, 100]}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete State</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{stateToDelete?.name}"? This action cannot be undone and will also delete all associated cities and pincodes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
