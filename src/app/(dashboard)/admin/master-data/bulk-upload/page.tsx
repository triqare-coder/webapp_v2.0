'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner'

export default function BulkUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const headers = 'country_name,state_name,city_name,pincode'
    const sampleRows = [
      'India,Kerala,Kochi,682001',
      'India,Kerala,Kochi,682002',
      'India,Kerala,Kochi,682016',
      'India,Kerala,Thiruvananthapuram,695001',
      'India,Kerala,Thiruvananthapuram,695002',
      'India,Karnataka,Bangalore,560001',
      'India,Karnataka,Bangalore,560002',
      'India,Karnataka,Mysore,570001',
      'India,Tamil Nadu,Chennai,600001',
      'India,Tamil Nadu,Chennai,600002',
      'India,Tamil Nadu,Coimbatore,641001',
      'India,Maharashtra,Mumbai,400001',
      'India,Maharashtra,Mumbai,400002',
      'India,Maharashtra,Pune,411001',
      'India,Gujarat,Ahmedabad,380001',
      'United States,California,Los Angeles,90001',
      'United States,California,San Francisco,94102',
      'United States,Texas,Houston,77001',
      'United States,New York,New York City,10001',
      'United Kingdom,England,London,SW1A 1AA'
    ]
    const csv = headers + '\n' + sampleRows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'locations_bulk_template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded successfully')
  }

  const exportAllData = async () => {
    try {
      const response = await fetch('/api/locations/bulk-export')
      const result = await response.json()

      if (response.ok) {
        const headers = 'country_name,state_name,city_name,pincode'
        const rows = result.data.map((row: any) => 
          `${row.country_name},${row.state_name},${row.city_name},${row.pincode}`
        )
        const csv = headers + '\n' + rows.join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `locations_export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported ${result.data.length} location records`)
      } else {
        toast.error(result.error || 'Failed to export data')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadResults(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/locations/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResults(result.results)
        toast.success(result.message)
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bulk Location Upload</h1>
        <p className="text-gray-600">Upload all location data (countries, states, cities, pincodes) from a single CSV file</p>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
          <CardDescription>
            Download template, export existing data, or upload new location data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={downloadTemplate} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={exportAllData} variant="outline" className="flex-1">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
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
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">CSV Format:</h3>
            <code className="block bg-gray-100 p-3 rounded text-sm">
              country_name,state_name,city_name,pincode
            </code>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Example:</h3>
            <code className="block bg-gray-100 p-3 rounded text-sm">
              India,Kerala,Kochi,682001<br />
              India,Kerala,Kochi,682002<br />
              India,Karnataka,Bangalore,560001
            </code>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Process:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>System automatically extracts unique countries, states, and cities</li>
              <li>Creates countries first (if they don't exist)</li>
              <li>Creates states linked to countries (if they don't exist)</li>
              <li>Creates cities linked to states (if they don't exist)</li>
              <li>Creates pincodes linked to cities</li>
              <li>Skips duplicates and reports errors</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Download the template to see the correct format</li>
              <li>You can mix data from multiple countries in one file</li>
              <li>The system handles the hierarchical relationships automatically</li>
              <li>Existing records will be skipped (no duplicates)</li>
              <li>Check the results summary after upload</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {uploadResults && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Countries</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{uploadResults.countries.successful}</p>
                <p className="text-xs text-green-600">Created</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">States</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{uploadResults.states.successful}</p>
                <p className="text-xs text-blue-600">Created</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded p-4">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Cities</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{uploadResults.cities.successful}</p>
                <p className="text-xs text-purple-600">Created</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded p-4">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Pincodes</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{uploadResults.pincodes.successful}</p>
                <p className="text-xs text-orange-600">Created</p>
              </div>
            </div>

            {(uploadResults.countries.errors.length > 0 ||
              uploadResults.states.errors.length > 0 ||
              uploadResults.cities.errors.length > 0 ||
              uploadResults.pincodes.errors.length > 0) && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Errors</span>
                </div>
                <div className="space-y-2 text-sm">
                  {uploadResults.countries.errors.length > 0 && (
                    <div>
                      <p className="font-semibold text-red-800">Countries:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {uploadResults.countries.errors.slice(0, 5).map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {uploadResults.states.errors.length > 0 && (
                    <div>
                      <p className="font-semibold text-red-800">States:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {uploadResults.states.errors.slice(0, 5).map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {uploadResults.cities.errors.length > 0 && (
                    <div>
                      <p className="font-semibold text-red-800">Cities:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {uploadResults.cities.errors.slice(0, 5).map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {uploadResults.pincodes.errors.length > 0 && (
                    <div>
                      <p className="font-semibold text-red-800">Pincodes:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {uploadResults.pincodes.errors.slice(0, 5).map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

