'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Database, 
  FileText, 
  Calendar, 
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Truck,
  Building2,
  Activity
} from 'lucide-react'

export default function DataExportPage() {
  const [loading, setLoading] = useState(false)
  const [exportConfig, setExportConfig] = useState({
    dataType: '',
    format: 'csv',
    dateRange: 'month',
    startDate: '',
    endDate: '',
    includeFields: [] as string[],
    filters: {
      status: 'all',
      priority: 'all',
      type: 'all'
    }
  })

  const dataTypes = [
    {
      id: 'emergency_cases',
      name: 'Emergency Cases',
      description: 'SOS cases, assignments, and response data',
      icon: AlertTriangle,
      recordCount: 1247,
      fields: ['Case ID', 'Patient Name', 'Priority', 'Status', 'Response Time', 'Location', 'Outcome']
    },
    {
      id: 'patients',
      name: 'Patient Records',
      description: 'Patient information and medical history',
      icon: Users,
      recordCount: 2847,
      fields: ['Patient ID', 'Name', 'Age', 'Gender', 'Medical History', 'Contact Info', 'Emergency Contacts']
    },
    {
      id: 'vehicles',
      name: 'Vehicle Fleet',
      description: 'Ambulance and vehicle management data',
      icon: Truck,
      recordCount: 45,
      fields: ['Vehicle ID', 'Type', 'Status', 'Location', 'Driver', 'Maintenance', 'Utilization']
    },
    {
      id: 'hospitals',
      name: 'Hospital Network',
      description: 'Hospital information and capacity data',
      icon: Building2,
      recordCount: 28,
      fields: ['Hospital ID', 'Name', 'Address', 'Capacity', 'Specialties', 'Contact Info', 'Availability']
    },
    {
      id: 'drivers',
      name: 'Driver Records',
      description: 'Driver information and performance data',
      icon: Users,
      recordCount: 67,
      fields: ['Driver ID', 'Name', 'License', 'Certifications', 'Performance', 'Schedule', 'Contact Info']
    },
    {
      id: 'system_logs',
      name: 'System Activity',
      description: 'System logs and audit trails',
      icon: Activity,
      recordCount: 15420,
      fields: ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Status', 'Details']
    }
  ]

  const handleExport = async () => {
    setLoading(true)
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Exporting data:', exportConfig)
    setLoading(false)
    
    // In a real app, this would trigger the actual export
    alert(`Export completed! ${exportConfig.dataType} data has been exported as ${exportConfig.format.toUpperCase()}.`)
  }

  const handleFieldToggle = (field: string) => {
    setExportConfig(prev => ({
      ...prev,
      includeFields: prev.includeFields.includes(field)
        ? prev.includeFields.filter(f => f !== field)
        : [...prev.includeFields, field]
    }))
  }

  const selectedDataType = dataTypes.find(dt => dt.id === exportConfig.dataType)

  const exportHistory = [
    {
      id: '1',
      type: 'Emergency Cases',
      format: 'CSV',
      date: '2024-01-15 14:30',
      size: '2.4 MB',
      records: 1247,
      status: 'completed'
    },
    {
      id: '2',
      type: 'Patient Records',
      format: 'Excel',
      date: '2024-01-14 09:15',
      size: '5.8 MB',
      records: 2847,
      status: 'completed'
    },
    {
      id: '3',
      type: 'Vehicle Fleet',
      format: 'JSON',
      date: '2024-01-13 16:45',
      size: '156 KB',
      records: 45,
      status: 'completed'
    }
  ]

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="h-6 w-6 mr-2" />
            Data Export
          </h1>
          <p className="text-gray-600">Export system data for analysis, reporting, and backup purposes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Data Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Data Type</CardTitle>
                <CardDescription>Choose the type of data you want to export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataTypes.map((dataType) => (
                    <div
                      key={dataType.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        exportConfig.dataType === dataType.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setExportConfig(prev => ({ ...prev, dataType: dataType.id, includeFields: [] }))}
                    >
                      <div className="flex items-center space-x-3">
                        <dataType.icon className="h-6 w-6 text-gray-600" />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{dataType.name}</h3>
                          <p className="text-sm text-gray-500">{dataType.description}</p>
                          <Badge variant="secondary" className="mt-1">
                            {dataType.recordCount.toLocaleString()} records
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            {exportConfig.dataType && (
              <Card>
                <CardHeader>
                  <CardTitle>Export Configuration</CardTitle>
                  <CardDescription>Configure export format and date range</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="format">Export Format</Label>
                      <Select 
                        value={exportConfig.format} 
                        onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                          <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateRange">Date Range</Label>
                      <Select 
                        value={exportConfig.dateRange} 
                        onValueChange={(value) => setExportConfig(prev => ({ ...prev, dateRange: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Last 7 days</SelectItem>
                          <SelectItem value="month">Last 30 days</SelectItem>
                          <SelectItem value="quarter">Last 3 months</SelectItem>
                          <SelectItem value="year">Last 12 months</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {exportConfig.dateRange === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={exportConfig.startDate}
                          onChange={(e) => setExportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={exportConfig.endDate}
                          onChange={(e) => setExportConfig(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Field Selection */}
            {selectedDataType && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Fields</CardTitle>
                  <CardDescription>Choose which fields to include in the export</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedDataType.fields.map((field) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={exportConfig.includeFields.includes(field)}
                          onCheckedChange={() => handleFieldToggle(field)}
                        />
                        <Label htmlFor={field} className="text-sm">
                          {field}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setExportConfig(prev => ({ 
                          ...prev, 
                          includeFields: selectedDataType.fields 
                        }))}
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setExportConfig(prev => ({ ...prev, includeFields: [] }))}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Button */}
            {exportConfig.dataType && exportConfig.includeFields.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Ready to Export</h3>
                      <p className="text-sm text-gray-500">
                        {exportConfig.includeFields.length} fields selected from {selectedDataType?.name}
                      </p>
                    </div>
                    <Button onClick={handleExport} disabled={loading}>
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? 'Exporting...' : 'Export Data'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Export History */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Export History
                </CardTitle>
                <CardDescription>Recent data exports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exportHistory.map((export_item) => (
                    <div key={export_item.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{export_item.type}</h4>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {export_item.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {export_item.date}
                        </div>
                        <div>Format: {export_item.format}</div>
                        <div>Size: {export_item.size}</div>
                        <div>Records: {export_item.records.toLocaleString()}</div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p>Large exports may take several minutes to complete</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p>Export files are available for download for 7 days</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Database className="h-4 w-4 text-green-600 mt-0.5" />
                  <p>All exports include data validation and integrity checks</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
