'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Plus, Edit, Trash2, Users, Settings } from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string
  userCount: number
  permissions: string[]
  color: string
}

export default function RoleManagementPage() {
  const [roles] = useState<Role[]>([
    {
      id: '1',
      name: 'System Administrator',
      description: 'Full system access with all administrative privileges',
      userCount: 3,
      permissions: ['all_permissions'],
      color: 'bg-red-100 text-red-800'
    },
    {
      id: '2',
      name: 'Emergency Response Team',
      description: 'Emergency response coordination and SOS management',
      userCount: 12,
      permissions: ['emergency_response', 'sos_management', 'view_reports'],
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: '3',
      name: 'Transport Company',
      description: 'Fleet and driver management for transport companies',
      userCount: 8,
      permissions: ['fleet_management', 'driver_management', 'view_assignments'],
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: '4',
      name: 'Hospital Staff',
      description: 'Hospital operations and patient management',
      userCount: 25,
      permissions: ['patient_management', 'hospital_operations', 'view_reports'],
      color: 'bg-green-100 text-green-800'
    },
    {
      id: '5',
      name: 'Dispatcher',
      description: 'Emergency dispatch and coordination',
      userCount: 6,
      permissions: ['dispatch_operations', 'emergency_coordination', 'communication'],
      color: 'bg-purple-100 text-purple-800'
    }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  })

  const availablePermissions = [
    { id: 'view_dashboard', name: 'View Dashboard', category: 'General' },
    { id: 'manage_users', name: 'Manage Users', category: 'Administration' },
    { id: 'manage_patients', name: 'Manage Patients', category: 'Medical' },
    { id: 'manage_hospitals', name: 'Manage Hospitals', category: 'Medical' },
    { id: 'manage_ambulances', name: 'Manage Ambulances', category: 'Fleet' },
    { id: 'manage_drivers', name: 'Manage Drivers', category: 'Fleet' },
    { id: 'view_reports', name: 'View Reports', category: 'Analytics' },
    { id: 'manage_reports', name: 'Manage Reports', category: 'Analytics' },
    { id: 'system_settings', name: 'System Settings', category: 'Administration' },
    { id: 'emergency_response', name: 'Emergency Response', category: 'Emergency' },
    { id: 'sos_management', name: 'SOS Management', category: 'Emergency' },
    { id: 'fleet_management', name: 'Fleet Management', category: 'Fleet' },
    { id: 'dispatch_operations', name: 'Dispatch Operations', category: 'Operations' },
    { id: 'hospital_operations', name: 'Hospital Operations', category: 'Medical' },
    { id: 'patient_management', name: 'Patient Management', category: 'Medical' },
    { id: 'driver_management', name: 'Driver Management', category: 'Fleet' },
    { id: 'view_assignments', name: 'View Assignments', category: 'Operations' },
    { id: 'emergency_coordination', name: 'Emergency Coordination', category: 'Emergency' },
    { id: 'communication', name: 'Communication', category: 'Operations' }
  ]

  const handleCreateRole = () => {
    console.log('Creating role:', newRole)
    setShowCreateForm(false)
    setNewRole({ name: '', description: '', permissions: [] })
  }

  const handlePermissionToggle = (permissionId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, typeof availablePermissions>)

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-gray-600">Manage user roles and permissions</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Create Role Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
              <CardDescription>Define a new role with specific permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDescription">Description</Label>
                  <Input
                    id="roleDescription"
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter role description"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-4">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={newRole.permissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <Label htmlFor={permission.id} className="text-sm">
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>
                  Create Role
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <Badge className={role.color}>
                    {role.userCount} users
                  </Badge>
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Permissions</Label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.replace('_', ' ')}
                        </Badge>
                      ))}
                      {role.permissions.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{role.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      {role.userCount} assigned
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Role Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Role Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{roles.length}</div>
                <div className="text-sm text-gray-500">Total Roles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {roles.reduce((sum, role) => sum + role.userCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {availablePermissions.length}
                </div>
                <div className="text-sm text-gray-500">Available Permissions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(groupedPermissions).length}
                </div>
                <div className="text-sm text-gray-500">Permission Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
