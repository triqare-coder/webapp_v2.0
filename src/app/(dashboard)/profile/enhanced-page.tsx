'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRole } from '@/hooks/useRole'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X, 
  Camera,
  Database,
  RefreshCw,
  Heart,
  Briefcase,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { UserService } from '@/services/userService'
import { DatabaseUser } from '@/lib/supabase'

export default function EnhancedProfilePage() {
  const { user, isLoaded } = useUser()
  const { role, loading: roleLoading } = useRole()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null)
  const [loadingDbUser, setLoadingDbUser] = useState(true)
  
  // Enhanced form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalConditions: '',
    allergies: '',
    medications: '',
    bloodType: '',
    department: '',
    position: '',
    employeeId: '',
  })

  // Load database user profile
  const loadDbUser = async () => {
    if (!user?.id) return
    
    setLoadingDbUser(true)
    try {
      const { data, error } = await UserService.getUserByClerkId(user.id)
      if (error) {
        console.error('Error loading database user:', error)
        toast.error('Failed to load profile data')
      } else {
        setDbUser(data)
        if (data) {
          // Populate form with database data
          setFormData({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            phone: data.phone || '',
            bio: data.bio || '',
            dateOfBirth: data.date_of_birth || '',
            gender: data.gender || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zip_code || '',
            country: data.country || 'United States',
            emergencyContactName: data.emergency_contact_name || '',
            emergencyContactPhone: data.emergency_contact_phone || '',
            emergencyContactRelationship: data.emergency_contact_relationship || '',
            medicalConditions: data.medical_conditions || '',
            allergies: data.allergies || '',
            medications: data.medications || '',
            bloodType: data.blood_type || '',
            department: data.department || '',
            position: data.position || '',
            employeeId: data.employee_id || '',
          })
        }
      }
    } catch (error) {
      console.error('Error loading database user:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoadingDbUser(false)
    }
  }

  // Initialize form data when user loads
  useEffect(() => {
    if (user && isLoaded) {
      // First populate with Clerk data
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phoneNumbers?.[0]?.phoneNumber || '',
        bio: user.publicMetadata?.bio as string || '',
      }))
      
      // Then load database data
      loadDbUser()
    }
  }, [user, isLoaded])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const syncToDatabase = async () => {
    if (!user) return
    
    setSyncing(true)
    try {
      const { data, error } = await UserService.syncUserFromClerk({
        id: user.id,
        emailAddresses: user.emailAddresses,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        lastSignInAt: user.lastSignInAt?.getTime(),
        createdAt: user.createdAt?.getTime(),
        publicMetadata: user.publicMetadata
      })

      if (error) {
        toast.error(`Failed to sync to database: ${error}`)
      } else {
        setDbUser(data)
        toast.success('Profile synced to database successfully!')
        await loadDbUser() // Reload to get fresh data
      }
    } catch (error) {
      console.error('Error syncing to database:', error)
      toast.error('Failed to sync profile to database')
    } finally {
      setSyncing(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Update Clerk user
      if (formData.firstName !== user.firstName) {
        await user.update({
          firstName: formData.firstName,
        })
      }

      if (formData.lastName !== user.lastName) {
        await user.update({
          lastName: formData.lastName,
        })
      }

      // Update phone number
      const currentPhone = user.phoneNumbers?.[0]?.phoneNumber || ''
      if (formData.phone !== currentPhone) {
        if (formData.phone) {
          // Remove existing phone number if any
          if (user.phoneNumbers.length > 0) {
            await user.phoneNumbers[0].destroy()
          }
          // Create new phone number
          await user.createPhoneNumber({ phoneNumber: formData.phone })
        }
      }

      // Update bio in Clerk unsafe metadata (since publicMetadata is not available in user.update)
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          bio: formData.bio
        }
      })

      // Update database user if exists
      if (dbUser) {
        const { error } = await UserService.updateUser(dbUser.id, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: [formData.firstName, formData.lastName].filter(Boolean).join(' '),
          phone: formData.phone,
          bio: formData.bio,
          date_of_birth: formData.dateOfBirth || undefined,
          gender: formData.gender || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip_code: formData.zipCode || undefined,
          country: formData.country || undefined,
          emergency_contact_name: formData.emergencyContactName || undefined,
          emergency_contact_phone: formData.emergencyContactPhone || undefined,
          emergency_contact_relationship: formData.emergencyContactRelationship || undefined,
          medical_conditions: formData.medicalConditions || undefined,
          allergies: formData.allergies || undefined,
          medications: formData.medications || undefined,
          blood_type: formData.bloodType || undefined,
          department: formData.department || undefined,
          position: formData.position || undefined,
          employee_id: formData.employeeId || undefined,
        })

        if (error) {
          toast.error(`Failed to update database profile: ${error}`)
          return
        }
      }

      toast.success('Profile updated successfully!')
      setIsEditing(false)
      await loadDbUser() // Reload to get fresh data
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phoneNumbers?.[0]?.phoneNumber || '',
        bio: user.publicMetadata?.bio as string || '',
        dateOfBirth: dbUser?.date_of_birth || '',
        gender: dbUser?.gender || '',
        address: dbUser?.address || '',
        city: dbUser?.city || '',
        state: dbUser?.state || '',
        zipCode: dbUser?.zip_code || '',
        country: dbUser?.country || 'United States',
        emergencyContactName: dbUser?.emergency_contact_name || '',
        emergencyContactPhone: dbUser?.emergency_contact_phone || '',
        emergencyContactRelationship: dbUser?.emergency_contact_relationship || '',
        medicalConditions: dbUser?.medical_conditions || '',
        allergies: dbUser?.allergies || '',
        medications: dbUser?.medications || '',
        bloodType: dbUser?.blood_type || '',
        department: dbUser?.department || '',
        position: dbUser?.position || '',
        employeeId: dbUser?.employee_id || '',
      })
    }
    setIsEditing(false)
  }

  if (!isLoaded || roleLoading || loadingDbUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'ert': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'transport_company': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'driver': return 'bg-green-100 text-green-800 border-green-200'
      case 'patient': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'U'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>

        {/* Database Status */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Profile Data Status</span>
              </div>
              {!dbUser && (
                <Button onClick={syncToDatabase} disabled={syncing} size="sm">
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync to Database
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                dbUser ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  dbUser ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>{dbUser ? 'Synced with Database' : 'Clerk Only'}</span>
              </div>
              {dbUser && (
                <p className="text-sm text-gray-600">
                  Last updated: {new Date(dbUser.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rest of the profile content will be added in the next part */}
      </div>
    </div>
  )
}
