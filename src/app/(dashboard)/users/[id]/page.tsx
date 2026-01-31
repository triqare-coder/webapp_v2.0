'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import {
  User,
  Save,
  X,
  ArrowLeft,
  Phone,
  Building,
  Mail,
  Edit,
  Trash2,
  AlertTriangle,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// Mock user data
const mockUser = {
  id: '1',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@emergency.com',
  phone: '+1-555-0123',
  role: 'admin',
  department: 'administration',
  employeeId: 'EMP-001',
  position: 'System Administrator',
  address: '123 Admin Street',
  city: 'Anytown',
  state: 'ST',
  zipCode: '12345',
  emergencyContact: 'Jane Smith',
  emergencyPhone: '+1-555-0124',
  dateOfBirth: '1985-06-15',
  hireDate: '2023-01-15',
  salary: '75000',
  status: 'active',
  permissions: {
    canViewReports: true,
    canManageUsers: true,
    canManagePatients: true,
    canManageAmbulances: true,
    canManageHospitals: true,
    canManageDrivers: true,
    canViewSOS: true,
    canCreateSOS: true,
    canAssignSOS: true,
    canViewAnalytics: true
  },
  notes: 'Senior administrator with full system access.',
  createdAt: '2023-01-15',
  lastLogin: '2024-01-20'
}

export default function EditUserPage() {
  const params = useParams()
  const userId = params.id as string
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    employeeId: '',
    position: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: '',
    dateOfBirth: '',
    hireDate: '',
    salary: '',
    status: 'active',

    notes: ''
  })

  useEffect(() => {
    // In real app, fetch user data by ID
    setFormData({
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      email: mockUser.email,
      phone: mockUser.phone,
      role: mockUser.role,
      department: mockUser.department,
      employeeId: mockUser.employeeId,
      position: mockUser.position,
      address: mockUser.address,
      city: mockUser.city,
      state: mockUser.state,
      zipCode: mockUser.zipCode,
      emergencyContact: mockUser.emergencyContact,
      emergencyPhone: mockUser.emergencyPhone,
      dateOfBirth: mockUser.dateOfBirth,
      hireDate: mockUser.hireDate,
      salary: mockUser.salary,
      status: mockUser.status,
      notes: mockUser.notes
    })
  }, [userId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Updated user data:', formData)
    
    setIsSubmitting(false)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('Deleted user:', userId)
    
    setIsSubmitting(false)
    setShowDeleteConfirm(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'ert': return 'bg-blue-100 text-blue-800'
      case 'transport_company': return 'bg-green-100 text-green-800'
      case 'patient': return 'bg-purple-100 text-purple-800'
      case 'driver': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/users">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👤 User Details
              </h1>
              <p className="text-gray-600">
                User ID: {userId} • Joined: {mockUser.createdAt} • Last Login: {mockUser.lastLogin}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getRoleColor(mockUser.role)}>
              {mockUser.role.charAt(0).toUpperCase() + mockUser.role.slice(1)}
            </Badge>
            <Badge className={getStatusColor(mockUser.status)}>
              {mockUser.status.charAt(0).toUpperCase() + mockUser.status.slice(1)}
            </Badge>
            <Badge className="bg-red-100 text-red-800">
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit User
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
            Delete User
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
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange('employeeId', e.target.value)}
                    disabled={!isEditing}
                  />
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
            </CardContent>
          </Card>

          {/* Role & Department */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Role & Department
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">User Role</Label>
                  <Select 
                    value={formData.role}
                    onValueChange={(value) => handleInputChange('role', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">System Administrator</SelectItem>
                      <SelectItem value="ert">Emergency Response Team</SelectItem>
                      <SelectItem value="transport_company">Transport Company</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={formData.department}
                    onValueChange={(value) => handleInputChange('department', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="emergency-services">Emergency Services</SelectItem>
                      <SelectItem value="transport">Transport Services</SelectItem>
                      <SelectItem value="medical">Medical Services</SelectItem>
                      <SelectItem value="dispatch">Dispatch Center</SelectItem>
                      <SelectItem value="it">IT Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="position">Position/Title</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Account Status</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending Activation</SelectItem>
                    </SelectContent>
                  </Select>
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
                <p>Are you sure you want to delete this user? This action cannot be undone.</p>
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
                        Delete User
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
