'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Mail, Shield, Loader2, CheckCircle, AlertCircle, Key } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AddUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteMode, setInviteMode] = useState(true) // Default to invitation mode
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate required fields
      if (!formData.email || !formData.role) {
        throw new Error('Please fill in all required fields (email and role)')
      }

      if (inviteMode) {
        // Send invitation
        const inviteData = {
          email: formData.email,
          role: formData.role,
          redirectUrl: `${window.location.origin}/sign-up`
        }

        const response = await fetch('/api/admin/users/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(inviteData),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send invitation')
        }

        setSuccess(true)
        toast.success(result.message || 'Invitation sent successfully!')

        setTimeout(() => {
          router.push('/admin/users/assign-roles')
        }, 2000)

      } else {
        // Create user directly with password
        if (!formData.firstName) {
          throw new Error('Please enter first name')
        }

        if (!formData.password) {
          throw new Error('Please enter a password')
        }

        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }

        const userData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          password: formData.password
        }

        const response = await fetch('/api/admin/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user')
        }

        setSuccess(true)
        toast.success(result.message || 'User created successfully!')

        setTimeout(() => {
          router.push('/admin/users/assign-roles')
        }, 2000)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : inviteMode ? 'Failed to send invitation' : 'Failed to create user'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }



  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/users/assign-roles">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to User Management
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
              <p className="text-gray-600">Create a new user account with appropriate permissions</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>{inviteMode ? 'Invitation sent successfully!' : 'User created successfully!'} Redirecting to users list...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center text-red-800">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creation Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                User Creation Method
              </CardTitle>
              <CardDescription>Choose how to add the new user to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setInviteMode(true)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    inviteMode
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Mail className={`h-5 w-5 mt-0.5 ${inviteMode ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className={`font-semibold ${inviteMode ? 'text-blue-900' : 'text-gray-900'}`}>
                        Send Invitation (Recommended)
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        User receives an email invitation to set up their own account and password
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteMode(false)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    !inviteMode
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Key className={`h-5 w-5 mt-0.5 ${!inviteMode ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className={`font-semibold ${!inviteMode ? 'text-blue-900' : 'text-gray-900'}`}>
                        Create with Password
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Create account immediately with a password you set
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                {inviteMode ? 'User Information' : 'Personal Information'}
              </CardTitle>
              <CardDescription>
                {inviteMode
                  ? 'Enter the email address and role for the invitation'
                  : 'Basic user information and contact details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!inviteMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                      required={!inviteMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                  />
                </div>
              </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  required
                />
                {inviteMode && (
                  <p className="text-sm text-gray-500">
                    An invitation email will be sent to this address
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Role Information
              </CardTitle>
              <CardDescription>User role and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">User Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user role" />
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
              </div>
            </CardContent>
          </Card>

          {/* Password Setup - Only show in direct creation mode */}
          {!inviteMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Password Setup
                </CardTitle>
                <CardDescription>Set a password for the new user account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter password (minimum 8 characters)"
                    required={!inviteMode}
                  />
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link href="/admin/users/assign-roles">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || success}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : inviteMode ? (
                <Mail className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading
                ? (inviteMode ? 'Sending Invitation...' : 'Creating User...')
                : success
                  ? (inviteMode ? 'Invitation Sent!' : 'User Created!')
                  : (inviteMode ? 'Send Invitation' : 'Create User')
              }
            </Button>
          </div>
        </form>
      </div>
  )
}
