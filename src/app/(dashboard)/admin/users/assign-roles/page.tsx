'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Users,
  Shield,
  AlertTriangle,
  Truck,
  UserCheck,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { UserRole } from '@/types'

interface UserWithRole {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: UserRole | null
  createdAt: string
  lastSignInAt: string | null
  imageUrl: string
}

interface RoleStats {
  admin: number
  ert: number
  transport_company: number
  patient: number
  driver: number
  unassigned: number
  total: number
}

export default function AssignRolesPage() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [roleStats, setRoleStats] = useState<RoleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all' | 'unassigned'>('all')
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [newRole, setNewRole] = useState<UserRole | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (roleFilter !== 'all' && roleFilter !== 'unassigned') {
        params.append('role', roleFilter)
      }
      
      const response = await fetch(`/api/users/roles?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users)
      setRoleStats(data.roleStats)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  const handleEditRole = (user: UserWithRole) => {
    setEditingUser(user)
    setNewRole(user.role || '')
    setDialogOpen(true)
  }

  const handleUpdateRole = async () => {
    if (!editingUser || !newRole) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/users/${editingUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Failed to update role')

      const data = await response.json()
      toast.success(data.message)
      
      // Update local state
      setUsers(users.map(user => 
        user.id === editingUser.id 
          ? { ...user, role: newRole as UserRole }
          : user
      ))
      
      setDialogOpen(false)
      setEditingUser(null)
      setNewRole('')
      
      // Refresh stats
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update user role')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveRole = async (user: UserWithRole) => {
    if (!confirm(`Remove role from ${user.fullName}?`)) return

    try {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove role')

      const data = await response.json()
      toast.success(data.message)
      
      // Update local state
      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, role: null }
          : u
      ))
      
      // Refresh stats
      fetchUsers()
    } catch (error) {
      console.error('Error removing role:', error)
      toast.error('Failed to remove user role')
    }
  }

  const getRoleIcon = (role: UserRole | null) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-red-600" />
      case 'ert': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'transport_company': return <Truck className="h-4 w-4 text-blue-600" />
      case 'patient': return <Users className="h-4 w-4 text-green-600" />
      case 'driver': return <UserCheck className="h-4 w-4 text-purple-600" />
      default: return <Users className="h-4 w-4 text-gray-400" />
    }
  }

  const getRoleBadge = (role: UserRole | null) => {
    if (!role) return <Badge variant="outline">No Role</Badge>
    
    const colors = {
      admin: 'bg-red-100 text-red-800',
      ert: 'bg-orange-100 text-orange-800',
      transport_company: 'bg-blue-100 text-blue-800',
      patient: 'bg-green-100 text-green-800',
      driver: 'bg-purple-100 text-purple-800'
    }
    
    const labels = {
      admin: 'Administrator',
      ert: 'Emergency Response',
      transport_company: 'Transport Company',
      patient: 'Patient',
      driver: 'Driver'
    }
    
    return (
      <Badge className={colors[role]}>
        {getRoleIcon(role)}
        <span className="ml-1">{labels[role]}</span>
      </Badge>
    )
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'unassigned' && !user.role) ||
                       user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assign User Roles</h1>
            <p className="text-gray-600">Assign and manage user roles across the system</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/admin/users/add">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create New User
              </Button>
            </Link>
            <Button onClick={fetchUsers} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Role Statistics */}
        {roleStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{roleStats.admin}</p>
                    <p className="text-xs text-gray-600">Administrators</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{roleStats.ert}</p>
                    <p className="text-xs text-gray-600">ERT Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{roleStats.transport_company}</p>
                    <p className="text-xs text-gray-600">Transport Co.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{roleStats.patient}</p>
                    <p className="text-xs text-gray-600">Patients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{roleStats.driver}</p>
                    <p className="text-xs text-gray-600">Drivers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-600">{roleStats.unassigned}</p>
                    <p className="text-xs text-gray-600">Unassigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="ert">Emergency Response</SelectItem>
                  <SelectItem value="transport_company">Transport Company</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading users...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <img
                            src={user.imageUrl}
                            alt={user.fullName}
                            className="h-8 w-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium">{user.fullName}</p>
                            <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.lastSignInAt
                          ? new Date(user.lastSignInAt).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRole(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.role && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveRole(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>
                Assign a role to {editingUser?.fullName} ({editingUser?.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Role</label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <span>Administrator</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ert">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span>Emergency Response Team</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="transport_company">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span>Transport Company</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="patient">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span>Patient</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="driver">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-purple-600" />
                        <span>Driver</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={!newRole || updating}
              >
                {updating ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}
