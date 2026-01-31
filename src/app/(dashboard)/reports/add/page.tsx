'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  FileText, 
  Save, 
  X,
  ArrowLeft,
  BarChart,
  Calendar,
  Filter,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function CreateReportPage() {
  const [formData, setFormData] = useState({
    reportName: '',
    reportType: '',
    description: '',
    dateRange: 'last-30-days',
    startDate: '',
    endDate: '',
    includePatients: true,
    includeAmbulances: true,
    includeDrivers: true,
    includeHospitals: true,
    includeSOSCases: true,
    includePerformanceMetrics: false,
    includeFinancialData: false,
    includeGeographicData: false,
    filterByStatus: '',
    filterByPriority: '',
    filterByLocation: '',
    outputFormat: 'pdf',
    scheduleReport: false,
    scheduleFrequency: '',
    emailRecipients: '',
    notes: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Report data:', formData)
    
    setIsSubmitting(false)
    // Redirect to reports list or show success message
  }

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'operational': return 'bg-blue-100 text-blue-800'
      case 'performance': return 'bg-green-100 text-green-800'
      case 'financial': return 'bg-yellow-100 text-yellow-800'
      case 'compliance': return 'bg-purple-100 text-purple-800'
      case 'analytics': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/reports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 Create New Report
              </h1>
              <p className="text-gray-600">
                Generate custom reports for the emergency response system
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {formData.reportType && (
              <Badge className={getReportTypeColor(formData.reportType)}>
                {formData.reportType.charAt(0).toUpperCase() + formData.reportType.slice(1)}
              </Badge>
            )}
            <Badge className="bg-red-100 text-red-800">
              <FileText className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reportName">Report Name *</Label>
                  <Input
                    id="reportName"
                    value={formData.reportName}
                    onChange={(e) => handleInputChange('reportName', e.target.value)}
                    placeholder="Enter report name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reportType">Report Type *</Label>
                  <Select onValueChange={(value) => handleInputChange('reportType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational Report</SelectItem>
                      <SelectItem value="performance">Performance Report</SelectItem>
                      <SelectItem value="financial">Financial Report</SelectItem>
                      <SelectItem value="compliance">Compliance Report</SelectItem>
                      <SelectItem value="analytics">Analytics Report</SelectItem>
                      <SelectItem value="custom">Custom Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the purpose and scope of this report"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dateRange">Predefined Range</Label>
                <Select 
                  value={formData.dateRange}
                  onValueChange={(value) => handleInputChange('dateRange', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.dateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Inclusion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Data Inclusion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePatients"
                    checked={formData.includePatients}
                    onCheckedChange={(checked) => handleInputChange('includePatients', checked as boolean)}
                  />
                  <Label htmlFor="includePatients">Patient Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAmbulances"
                    checked={formData.includeAmbulances}
                    onCheckedChange={(checked) => handleInputChange('includeAmbulances', checked as boolean)}
                  />
                  <Label htmlFor="includeAmbulances">Ambulance Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDrivers"
                    checked={formData.includeDrivers}
                    onCheckedChange={(checked) => handleInputChange('includeDrivers', checked as boolean)}
                  />
                  <Label htmlFor="includeDrivers">Driver Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeHospitals"
                    checked={formData.includeHospitals}
                    onCheckedChange={(checked) => handleInputChange('includeHospitals', checked as boolean)}
                  />
                  <Label htmlFor="includeHospitals">Hospital Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeSOSCases"
                    checked={formData.includeSOSCases}
                    onCheckedChange={(checked) => handleInputChange('includeSOSCases', checked as boolean)}
                  />
                  <Label htmlFor="includeSOSCases">SOS Cases</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePerformanceMetrics"
                    checked={formData.includePerformanceMetrics}
                    onCheckedChange={(checked) => handleInputChange('includePerformanceMetrics', checked as boolean)}
                  />
                  <Label htmlFor="includePerformanceMetrics">Performance Metrics</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeFinancialData"
                    checked={formData.includeFinancialData}
                    onCheckedChange={(checked) => handleInputChange('includeFinancialData', checked as boolean)}
                  />
                  <Label htmlFor="includeFinancialData">Financial Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeGeographicData"
                    checked={formData.includeGeographicData}
                    onCheckedChange={(checked) => handleInputChange('includeGeographicData', checked as boolean)}
                  />
                  <Label htmlFor="includeGeographicData">Geographic Data</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filterByStatus">Filter by Status</Label>
                  <Select onValueChange={(value) => handleInputChange('filterByStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterByPriority">Filter by Priority</Label>
                  <Select onValueChange={(value) => handleInputChange('filterByPriority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filterByLocation">Filter by Location</Label>
                  <Input
                    id="filterByLocation"
                    value={formData.filterByLocation}
                    onChange={(e) => handleInputChange('filterByLocation', e.target.value)}
                    placeholder="City, State, or ZIP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Output Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select 
                    value={formData.outputFormat}
                    onValueChange={(value) => handleInputChange('outputFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV File</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="scheduleReport"
                    checked={formData.scheduleReport}
                    onCheckedChange={(checked) => handleInputChange('scheduleReport', checked as boolean)}
                  />
                  <Label htmlFor="scheduleReport">Schedule Recurring Report</Label>
                </div>
              </div>
              {formData.scheduleReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduleFrequency">Frequency</Label>
                    <Select onValueChange={(value) => handleInputChange('scheduleFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="emailRecipients">Email Recipients</Label>
                    <Input
                      id="emailRecipients"
                      value={formData.emailRecipients}
                      onChange={(e) => handleInputChange('emailRecipients', e.target.value)}
                      placeholder="email1@company.com, email2@company.com"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes or special requirements for this report"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link href="/reports">
              <Button variant="outline" type="button">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Report...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
  )
}
