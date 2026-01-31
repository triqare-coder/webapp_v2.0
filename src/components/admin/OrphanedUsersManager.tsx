'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Users, Trash2, UserX, UserPlus, RefreshCw, Eye } from 'lucide-react'
import { toast } from 'sonner'


// Helper functions for role display
const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'admin': return 'Administrator'
    case 'ert': return 'ERT Member'
    case 'transport_company': return 'Transport Company'
    case 'patient': return 'Patient'
    case 'driver': return 'Driver'
    default: return 'User'
  }
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800'
    case 'ert': return 'bg-blue-100 text-blue-800'
    case 'transport_company': return 'bg-green-100 text-green-800'
    case 'patient': return 'bg-purple-100 text-purple-800'
    case 'driver': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Helper functions for orphaned users
const getOrphanedUserDisplayName = (user: OrphanedUser): string => {
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.trim()
  }
  return user.email.split('@')[0]
}

const getOrphanedUserInitials = (user: OrphanedUser): string => {
  const displayName = getOrphanedUserDisplayName(user)
  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
  return initials || displayName.substring(0, 2).toUpperCase()
}

interface OrphanedUser {
  id: string
  clerk_user_id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  is_active: boolean
  status: string
}

interface OrphanedUsersData {
  count: number
  users: OrphanedUser[]
  error?: string
}

export function OrphanedUsersManager() {
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUsersData>({ count: 0, users: [] })
  const [loading, setLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: 'deactivate' | 'delete' | 'recreate' | null
    title: string
    description: string
  }>({
    open: false,
    action: null,
    title: '',
    description: ''
  })
  const [processing, setProcessing] = useState(false)

  const loadOrphanedUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/orphaned-users')
      const data = await response.json()
      
      if (data.success) {
        setOrphanedUsers(data.data)
      } else {
        toast.error('Failed to load orphaned users')
      }
    } catch (error) {
      toast.error('Failed to load orphaned users')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!actionDialog.action || selectedUsers.length === 0) return

    try {
      setProcessing(true)
      const response = await fetch('/api/admin/orphaned-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDialog.action,
          userIds: selectedUsers
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        setSelectedUsers([])
        await loadOrphanedUsers() // Refresh the list
      } else {
        toast.error(data.message || `Failed to ${actionDialog.action} users`)
      }
    } catch (error) {
      toast.error(`Failed to ${actionDialog.action} users`)
    } finally {
      setProcessing(false)
      setActionDialog({ open: false, action: null, title: '', description: '' })
    }
  }

  const openActionDialog = (action: 'deactivate' | 'delete' | 'recreate') => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    const actionConfig = {
      deactivate: {
        title: 'Deactivate Orphaned Users',
        description: `Are you sure you want to deactivate ${selectedUsers.length} orphaned user(s)? This will mark them as inactive but preserve their data and relationships.`
      },
      delete: {
        title: 'Delete Orphaned Users',
        description: `⚠️ Are you sure you want to permanently delete ${selectedUsers.length} orphaned user(s)? This action cannot be undone and may fail if users have related data.`
      },
      recreate: {
        title: 'Recreate Users in Clerk',
        description: `Are you sure you want to recreate ${selectedUsers.length} user(s) in Clerk? This will create new Clerk accounts and update the database references.`
      }
    }

    setActionDialog({
      open: true,
      action,
      ...actionConfig[action]
    })
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedUsers(prev => 
      prev.length === orphanedUsers.users.length 
        ? []
        : orphanedUsers.users.map(user => user.id)
    )
  }

  useEffect(() => {
    loadOrphanedUsers()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Orphaned Users Management</h2>
          <p className="text-muted-foreground">
            Manage users that exist in the database but not in Clerk
          </p>
        </div>
        <Button
          onClick={loadOrphanedUsers}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Orphaned Users</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{orphanedUsers.count}</div>
          <p className="text-xs text-muted-foreground">
            Users in database but not in Clerk
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      {orphanedUsers.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Select users and choose an action. {selectedUsers.length} user(s) selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedUsers.length === orphanedUsers.users.length}
                onCheckedChange={toggleSelectAll}
              />
              <label className="text-sm">Select All</label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => openActionDialog('deactivate')}
                disabled={selectedUsers.length === 0}
                variant="outline"
                size="sm"
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate ({selectedUsers.length})
              </Button>
              
              <Button
                onClick={() => openActionDialog('recreate')}
                disabled={selectedUsers.length === 0}
                variant="outline"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Recreate in Clerk ({selectedUsers.length})
              </Button>
              
              <Button
                onClick={() => openActionDialog('delete')}
                disabled={selectedUsers.length === 0}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedUsers.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {orphanedUsers.count > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Users ({orphanedUsers.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orphanedUsers.users.map((user) => (
                <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />
                  
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getOrphanedUserInitials(user)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{getOrphanedUserDisplayName(user)}</h4>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>

                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(user.created_at).toLocaleDateString()} | 
                      Clerk ID: {user.clerk_user_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orphaned Users</h3>
            <p className="text-muted-foreground">
              All database users are properly synchronized with Clerk.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.title}</DialogTitle>
            <DialogDescription>
              {actionDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionDialog.action === 'delete' ? 'destructive' : 'default'}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm ${actionDialog.action}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
