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
  Building,
  MapPin,
  Globe,
  Loader2,
  AlertCircle,
  Upload,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useCityManagement } from '@/hooks/useLocationManagement'
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

interface CityWithDetails {
  id: string
  name: string
  state_id: string
  state_name: string
  country_name: string
}

export default function CitiesPage() {
  const { deleteCity, loading: deleteLoading } = useCityManagement()
  const { cities, states, countries, loading, error, refetch } = useAllLocations()

  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Combine cities with state and country information
  const citiesWithDetails: CityWithDetails[] = useMemo(() => {
    if (!cities || !states || !countries) return []

    return cities.map(city => {
      const state = states.find(s => s.id === city.state_id)
      const country = state ? countries.find(c => c.id === state.country_id) : null

      return {
        id: city.id,
        name: city.name,
        state_id: city.state_id,
        state_name: state?.name || 'Unknown State',
        country_name: country?.name || 'Unknown Country'
      }
    })
  }, [cities, states, countries])

  // Filter cities based on search term
  const filteredCities = useMemo(() => {
    if (!citiesWithDetails) return []
    return citiesWithDetails.filter(city =>
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.state_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.country_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [citiesWithDetails, searchTerm])

  // Pagination
  const {
    currentPageData: currentCities,
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
  } = usePagination(filteredCities || [])

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id)
    try {
      const result = await deleteCity(id)

      if (result.success) {
        toast.success(`City "${name}" deleted successfully!`)
        refetch()
      } else {
        toast.error(result.error || 'Failed to delete city')
      }
    } catch (error) {
      console.error('Error deleting city:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  const downloadTemplate = () => {
    const headers = 'name,state_name,country_name'
    const sampleRows = [
      'Kochi,Kerala,India',
      'Thiruvananthapuram,Kerala,India',
      'Bangalore,Karnataka,India',
      'Mysore,Karnataka,India',
      'Chennai,Tamil Nadu,India',
      'Coimbatore,Tamil Nadu,India',
      'Mumbai,Maharashtra,India',
      'Pune,Maharashtra,India',
      'Los Angeles,California,United States',
      'San Francisco,California,United States'
    ]
    const csv = headers + '\n' + sampleRows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cities_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportData = () => {
    if (!citiesWithDetails || citiesWithDetails.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = 'name,state_name,country_name'
    const rows = citiesWithDetails.map(city =>
      `${city.name},${city.state_name},${city.country_name}`
    )
    const csv = headers + '\n' + rows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cities_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${citiesWithDetails.length} cities`)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/locations/cities/upload-csv', {
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
            <p className="text-muted-foreground">Loading cities...</p>
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
            <h2 className="text-lg font-semibold mb-2">Error Loading Cities</h2>
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
          <h1 className="text-2xl font-bold">Cities Management</h1>
          <p className="text-muted-foreground">Manage cities in the system</p>
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
          <Link href="/admin/master-data/cities/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add City
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Cities List
            </div>
            <Badge variant="secondary">{totalItems} cities</Badge>
          </CardTitle>
          <CardDescription>
            View and manage all cities in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search cities, states, or countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {currentCities.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>City Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCities.map((city) => (
                      <TableRow key={city.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                            {city.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {city.state_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                            {city.country_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link href={`/admin/master-data/cities/${city.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/master-data/cities/${city.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={deleteLoading && deletingId === city.id}
                                >
                                  {deleteLoading && deletingId === city.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete City</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{city.name}"? This action cannot be undone and will also delete all pincodes in this city.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(city.id, city.name)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete City
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
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cities Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No cities match your search criteria.' : 'No cities have been added yet.'}
              </p>
              {!searchTerm && (
                <Link href="/admin/master-data/cities/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First City
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
