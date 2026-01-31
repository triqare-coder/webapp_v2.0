'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Hash,
  Building,
  MapPin,
  Globe,
  Loader2,
  AlertCircle,
  Upload,
  Download,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePincodeManagement } from '@/hooks/useLocationManagement'
import { useAllLocations } from '@/hooks/useLocations'
import { usePagination } from '@/hooks/usePagination'
import { PaginationWithInfo } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface PincodeWithDetails {
  id: string
  code: string
  city_id: string
  city_name: string
  state_name: string
  country_name: string
}

export default function PincodesPage() {
  const { deletePincode, loading: deleteLoading } = usePincodeManagement()
  const { pincodes, cities, states, countries, loading, error, refetch } = useAllLocations()

  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Combine pincodes with city, state and country information
  const pincodesWithDetails: PincodeWithDetails[] = useMemo(() => {
    if (!pincodes || !cities || !states || !countries) return []

    return pincodes.map(pincode => {
      const city = cities.find(c => c.id === pincode.city_id)
      const state = city ? states.find(s => s.id === city.state_id) : null
      const country = state ? countries.find(c => c.id === state.country_id) : null

      return {
        id: pincode.id,
        code: pincode.code,
        city_id: pincode.city_id,
        city_name: city?.name || 'Unknown City',
        state_name: state?.name || 'Unknown State',
        country_name: country?.name || 'Unknown Country'
      }
    })
  }, [pincodes, cities, states, countries])

  // Filter pincodes based on search term
  const filteredPincodes = useMemo(() => {
    if (!pincodesWithDetails) return []
    if (!searchTerm.trim()) return pincodesWithDetails

    const searchLower = searchTerm.toLowerCase().trim()
    return pincodesWithDetails.filter(pincode =>
      (pincode.code || '').toLowerCase().includes(searchLower) ||
      (pincode.city_name || '').toLowerCase().includes(searchLower) ||
      (pincode.state_name || '').toLowerCase().includes(searchLower) ||
      (pincode.country_name || '').toLowerCase().includes(searchLower)
    )
  }, [pincodesWithDetails, searchTerm])

  // Pagination
  const {
    currentPageData: currentPincodes,
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
  } = usePagination(filteredPincodes || [])

  const handleDelete = async (id: string, code: string) => {
    setDeletingId(id)
    try {
      const result = await deletePincode(id)

      if (result.success) {
        toast.success(`Pincode "${code}" deleted successfully!`)
        refetch()
      } else {
        toast.error(result.error || 'Failed to delete pincode')
      }
    } catch (error) {
      console.error('Error deleting pincode:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  const downloadTemplate = () => {
    const headers = 'code,city_name,state_name,country_name'
    const sampleRows = [
      '682001,Kochi,Kerala,India',
      '682002,Kochi,Kerala,India',
      '682016,Kochi,Kerala,India',
      '695001,Thiruvananthapuram,Kerala,India',
      '560001,Bangalore,Karnataka,India',
      '560002,Bangalore,Karnataka,India',
      '600001,Chennai,Tamil Nadu,India',
      '600002,Chennai,Tamil Nadu,India',
      '400001,Mumbai,Maharashtra,India',
      '90001,Los Angeles,California,United States'
    ]
    const csv = headers + '\n' + sampleRows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pincodes_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportData = () => {
    if (!pincodesWithDetails || pincodesWithDetails.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = 'code,city_name,state_name,country_name'
    const rows = pincodesWithDetails.map(pincode =>
      `${pincode.code},${pincode.city_name},${pincode.state_name},${pincode.country_name}`
    )
    const csv = headers + '\n' + rows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pincodes_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${pincodesWithDetails.length} pincodes`)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/locations/pincodes/upload-csv', {
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
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading pincodes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading Pincodes</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pincodes Management</h1>
          <p className="text-muted-foreground">Manage pincodes in the system</p>
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
          <Link href="/admin/master-data/pincodes/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Pincode
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Pincodes List
            </div>
            <Badge variant="secondary">{totalItems} pincodes</Badge>
          </CardTitle>
          <CardDescription>
            View and manage all pincodes in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search pincodes, cities, states, or countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchTerm && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {filteredPincodes.length} of {pincodesWithDetails.length} results
              </Badge>
            )}
          </div>

          {currentPincodes.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pincode</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPincodes.map((pincode) => (
                      <TableRow key={pincode.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
                            <code className="bg-muted px-2 py-1 rounded text-sm">{pincode.code}</code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                            {pincode.city_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {pincode.state_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                            {pincode.country_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link href={`/admin/master-data/pincodes/${pincode.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/master-data/pincodes/${pincode.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={deleteLoading && deletingId === pincode.id}
                                >
                                  {deleteLoading && deletingId === pincode.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Pincode</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete pincode "{pincode.code}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(pincode.id, pincode.code)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Pincode
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator className="my-4" />
              
              <PaginationWithInfo
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                startIndex={startIndex}
                endIndex={endIndex}
                pageSizeOptions={[10, 25, 50, 100]}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
              />
            </>
          ) : (
            <div className="text-center py-8">
              <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pincodes Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No pincodes match your search criteria.' : 'No pincodes have been added yet.'}
              </p>
              {!searchTerm && (
                <Link href="/admin/master-data/pincodes/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Pincode
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
