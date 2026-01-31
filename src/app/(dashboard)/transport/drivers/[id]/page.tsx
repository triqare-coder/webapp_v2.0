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
  User, 
  Save, 
  X,
  ArrowLeft,
  Phone,
  Shield,
  Car,
  Calendar,
  FileText,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// Mock driver data
const mockDriver = {
  id: '1',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@transport.com',
  phone: '+1-555-0123',
  dateOfBirth: '1985-03-15',
  address: '123 Driver Lane',
  city: 'Anytown',
  state: 'ST',
  zipCode: '12345',
  emergencyContact: 'Jane Smith',
  emergencyPhone: '+1-555-0124',
  licenseNumber: 'D123456789',
  licenseClass: 'class-b',
  licenseExpiry: '2025-03-15',
  medicalCertExpiry: '2024-12-31',
  backgroundCheckDate: '2024-01-15',
  drugTestDate: '2024-01-20',
  trainingCompletionDate: '2024-02-01',
  employmentStatus: 'active',
  shiftPreference: 'day',
  hourlyRate: '28.50',
  yearsExperience: '8',
  specialCertifications: 'CPR, First Aid, EVOC',
  languagesSpoken: 'English, Spanish',
  hasCleanRecord: true,
  hasEMTCertification: true,
  hasHazmatEndorsement: false,
  canWorkNights: true,
  canWorkWeekends: true,
  canWorkHolidays: false,
  assignedVehicle: 'AMB-001',
  notes: 'Experienced driver with excellent safety record. Preferred for critical transports.',
  createdAt: '2024-01-10',
  lastPerformanceReview: '2024-02-15'
}

export default function EditDriverPage() {
  const params = useParams()
  const driverId = params.id as string
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: '',
    licenseNumber: '',
    licenseClass: '',
    licenseExpiry: '',
    medicalCertExpiry: '',
    backgroundCheckDate: '',
    drugTestDate: '',
    trainingCompletionDate: '',
    employmentStatus: '',
    shiftPreference: '',
    hourlyRate: '',
    yearsExperience: '',
    specialCertifications: '',
    languagesSpoken: '',
    hasCleanRecord: false,
    hasEMTCertification: false,
    hasHazmatEndorsement: false,
    canWorkNights: false,
    canWorkWeekends: false,
    canWorkHolidays: false,
    assignedVehicle: '',
    notes: ''
  })

  useEffect(() => {
    // In real app, fetch driver data by ID
    setFormData({
      firstName: mockDriver.firstName,
      lastName: mockDriver.lastName,
      email: mockDriver.email,
      phone: mockDriver.phone,
      dateOfBirth: mockDriver.dateOfBirth,
      address: mockDriver.address,
      city: mockDriver.city,
      state: mockDriver.state,
      zipCode: mockDriver.zipCode,
      emergencyContact: mockDriver.emergencyContact,
      emergencyPhone: mockDriver.emergencyPhone,
      licenseNumber: mockDriver.licenseNumber,
      licenseClass: mockDriver.licenseClass,
      licenseExpiry: mockDriver.licenseExpiry,
      medicalCertExpiry: mockDriver.medicalCertExpiry,
      backgroundCheckDate: mockDriver.backgroundCheckDate,
      drugTestDate: mockDriver.drugTestDate,
      trainingCompletionDate: mockDriver.trainingCompletionDate,
      employmentStatus: mockDriver.employmentStatus,
      shiftPreference: mockDriver.shiftPreference,
      hourlyRate: mockDriver.hourlyRate,
      yearsExperience: mockDriver.yearsExperience,
      specialCertifications: mockDriver.specialCertifications,
      languagesSpoken: mockDriver.languagesSpoken,
      hasCleanRecord: mockDriver.hasCleanRecord,
      hasEMTCertification: mockDriver.hasEMTCertification,
      hasHazmatEndorsement: mockDriver.hasHazmatEndorsement,
      canWorkNights: mockDriver.canWorkNights,
      canWorkWeekends: mockDriver.canWorkWeekends,
      canWorkHolidays: mockDriver.canWorkHolidays,
      assignedVehicle: mockDriver.assignedVehicle,
      notes: mockDriver.notes
    })
  }, [driverId])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Updated driver data:', formData)
    
    setIsSubmitting(false)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('Deleted driver:', driverId)
    
    setIsSubmitting(false)
    setShowDeleteConfirm(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'on-leave': return 'bg-yellow-100 text-yellow-800'
      case 'terminated': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/transport/drivers">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Drivers
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👨‍💼 Driver Details
              </h1>
              <p className="text-gray-600">
                Driver ID: {driverId} • Hired: {mockDriver.createdAt}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(mockDriver.employmentStatus)}>
              {mockDriver.employmentStatus.charAt(0).toUpperCase() + mockDriver.employmentStatus.slice(1)}
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <User className="h-3 w-3 mr-1" />
              Transport Access
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Driver
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(false)} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Driver
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="employmentStatus">Employment Status</Label>
                  <Select 
                    value={formData.employmentStatus}
                    onValueChange={(value) => handleInputChange('employmentStatus', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* License & Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                License & Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="licenseNumber">Driver's License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="licenseClass">License Class</Label>
                  <Select 
                    value={formData.licenseClass}
                    onValueChange={(value) => handleInputChange('licenseClass', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class-a">Class A CDL</SelectItem>
                      <SelectItem value="class-b">Class B CDL</SelectItem>
                      <SelectItem value="class-c">Class C</SelectItem>
                      <SelectItem value="chauffeur">Chauffeur License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="licenseExpiry">License Expiry Date</Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => handleInputChange('licenseExpiry', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="medicalCertExpiry">Medical Certificate Expiry</Label>
                  <Input
                    id="medicalCertExpiry"
                    type="date"
                    value={formData.medicalCertExpiry}
                    onChange={(e) => handleInputChange('medicalCertExpiry', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="specialCertifications">Special Certifications</Label>
                  <Input
                    id="specialCertifications"
                    value={formData.specialCertifications}
                    onChange={(e) => handleInputChange('specialCertifications', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => handleInputChange('yearsExperience', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="shiftPreference">Shift Preference</Label>
                  <Select 
                    value={formData.shiftPreference}
                    onValueChange={(value) => handleInputChange('shiftPreference', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day Shift (6AM-6PM)</SelectItem>
                      <SelectItem value="night">Night Shift (6PM-6AM)</SelectItem>
                      <SelectItem value="rotating">Rotating Shifts</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="languagesSpoken">Languages Spoken</Label>
                  <Input
                    id="languagesSpoken"
                    value={formData.languagesSpoken}
                    onChange={(e) => handleInputChange('languagesSpoken', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="assignedVehicle">Assigned Vehicle</Label>
                  <Select 
                    value={formData.assignedVehicle}
                    onValueChange={(value) => handleInputChange('assignedVehicle', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AMB-001">AMB-001 (Ford Transit)</SelectItem>
                      <SelectItem value="AMB-002">AMB-002 (Mercedes Sprinter)</SelectItem>
                      <SelectItem value="AMB-003">AMB-003 (Chevrolet Express)</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Background Checks & Training */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Background Checks & Training
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="backgroundCheckDate">Background Check Date</Label>
                  <Input
                    id="backgroundCheckDate"
                    type="date"
                    value={formData.backgroundCheckDate}
                    onChange={(e) => handleInputChange('backgroundCheckDate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="drugTestDate">Drug Test Date</Label>
                  <Input
                    id="drugTestDate"
                    type="date"
                    value={formData.drugTestDate}
                    onChange={(e) => handleInputChange('drugTestDate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="trainingCompletionDate">Training Completion Date</Label>
                  <Input
                    id="trainingCompletionDate"
                    type="date"
                    value={formData.trainingCompletionDate}
                    onChange={(e) => handleInputChange('trainingCompletionDate', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualifications & Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Qualifications & Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasCleanRecord"
                    checked={formData.hasCleanRecord}
                    onCheckedChange={(checked) => handleInputChange('hasCleanRecord', checked as boolean)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="hasCleanRecord">Clean Driving Record</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasEMTCertification"
                    checked={formData.hasEMTCertification}
                    onCheckedChange={(checked) => handleInputChange('hasEMTCertification', checked as boolean)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="hasEMTCertification">EMT Certification</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasHazmatEndorsement"
                    checked={formData.hasHazmatEndorsement}
                    onCheckedChange={(checked) => handleInputChange('hasHazmatEndorsement', checked as boolean)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="hasHazmatEndorsement">Hazmat Endorsement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canWorkNights"
                    checked={formData.canWorkNights}
                    onCheckedChange={(checked) => handleInputChange('canWorkNights', checked as boolean)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="canWorkNights">Available Nights</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canWorkWeekends"
                    checked={formData.canWorkWeekends}
                    onCheckedChange={(checked) => handleInputChange('canWorkWeekends', checked as boolean)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="canWorkWeekends">Available Weekends</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canWorkHolidays"
                    checked={formData.canWorkHolidays}
                    onCheckedChange={(checked) => handleInputChange('canWorkHolidays', checked as boolean)}
                    disabled={!isEditing}
                  />
                  <Label htmlFor="canWorkHolidays">Available Holidays</Label>
                </div>
              </div>
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
                disabled={!isEditing}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Save Button - Only show when editing */}
          {isEditing && (
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Deletion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Are you sure you want to delete this driver? This action cannot be undone.</p>
                <div className="flex items-center justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Driver
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  )
}
