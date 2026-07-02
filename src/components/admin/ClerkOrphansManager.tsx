'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Users, Trash2, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

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

interface ClerkOrphan {
  clerk_user_id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string | null
  last_sign_in_at: string | null
}

interface ClerkOrphansData {
  count: number
  users: ClerkOrphan[]
  totalClerk: number
  totalDatabase: number
}

const getDisplayName = (user: ClerkOrphan): string => {
  if (user.full_name && user.full_name.trim()) return user.full_name.trim()
  if (user.email) return user.email.split('@')[0]
  return user.clerk_user_id
}

const getInitials = (user: ClerkOrphan): string => {
  const displayName = getDisplayName(user)
  const initials = displayName
    .split(' ')
    .map((name) => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
  return initials || displayName.substring(0, 2).toUpperCase()
}

export function ClerkOrphansManager() {
  const [orphans, setOrphans] = useState<ClerkOrphansData>({ count: 0, users: [], totalClerk: 0, totalDatabase: 0 })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: 'import' | 'delete' | null
    title: string
    description: string
  }>({ open: false, action: null, title: '', description: '' })
  const [processing, setProcessing] = useState(false)

  const loadOrphans = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users/clerk-orphans')
      const data = await response.json()
      if (data.success) {
        setOrphans(data.data)
        setSelected([])
      } else {
        toast.error(data.error || 'Failed to load Clerk-only accounts')
      }
    } catch {
      toast.error('Failed to load Clerk-only accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!actionDialog.action || selected.length === 0) return
    try {
      setProcessing(true)
      const response = await fetch('/api/admin/users/clerk-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionDialog.action, clerkUserIds: selected }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        if (data.results?.errors?.length) {
          console.warn('Clerk-orphan action errors:', data.results.errors)
        }
        await loadOrphans()
      } else {
        toast.error(data.message || data.error || `Failed to ${actionDialog.action} accounts`)
      }
    } catch {
      toast.error(`Failed to ${actionDialog.action} accounts`)
    } finally {
      setProcessing(false)
      setActionDialog({ open: false, action: null, title: '', description: '' })
    }
  }

  const openActionDialog = (action: 'import' | 'delete') => {
    if (selected.length === 0) {
      toast.error('Please select accounts first')
      return
    }
    const actionConfig = {
      import: {
        title: 'Import Accounts to Database',
        description: `Create the missing users row for ${selected.length} account(s) so they appear in the dashboard and can sign in. Role defaults to Patient unless Clerk metadata specifies otherwise.`,
      },
      delete: {
        title: 'Delete Accounts from Clerk',
        description: `⚠️ Permanently delete ${selected.length} account(s) from Clerk. Use this for abandoned/duplicate sign-ups so the email can be registered again. This cannot be undone.`,
      },
    }
    setActionDialog({ open: true, action, ...actionConfig[action] })
  }

  const toggleSelection = (clerkUserId: string) => {
    setSelected((prev) =>
      prev.includes(clerkUserId) ? prev.filter((id) => id !== clerkUserId) : [...prev, clerkUserId]
    )
  }

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.length === orphans.users.length ? [] : orphans.users.map((u) => u.clerk_user_id)))
  }

  useEffect(() => {
    loadOrphans()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clerk-Only Accounts</h2>
          <p className="text-muted-foreground">
            Accounts that exist in Clerk but have no database record — invisible in All Users, and they block re-registration
          </p>
        </div>
        <Button onClick={loadOrphans} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clerk-Only Accounts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{orphans.count}</div>
          <p className="text-xs text-muted-foreground">
            {orphans.totalClerk} in Clerk · {orphans.totalDatabase} in database
          </p>
        </CardContent>
      </Card>

      {orphans.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Select accounts and choose an action. {selected.length} account(s) selected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox checked={selected.length === orphans.users.length} onCheckedChange={toggleSelectAll} />
              <label className="text-sm">Select All</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openActionDialog('import')} disabled={selected.length === 0} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Import to Database ({selected.length})
              </Button>
              <Button onClick={() => openActionDialog('delete')} disabled={selected.length === 0} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete from Clerk ({selected.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orphans.count > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Clerk-Only Accounts ({orphans.count})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orphans.users.map((user) => (
                <div key={user.clerk_user_id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Checkbox
                    checked={selected.includes(user.clerk_user_id)}
                    onCheckedChange={() => toggleSelection(user.clerk_user_id)}
                  />
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(user)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{getDisplayName(user)}</h4>
                      <Badge className={getRoleBadgeColor(user.role)}>{getRoleDisplayName(user.role)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email || '(no email)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.created_at ? `Created: ${new Date(user.created_at).toLocaleDateString()} | ` : ''}
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
            <h3 className="text-lg font-semibold mb-2">No Clerk-Only Accounts</h3>
            <p className="text-muted-foreground">Every Clerk account has a matching database record.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.title}</DialogTitle>
            <DialogDescription>{actionDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog((prev) => ({ ...prev, open: false }))} disabled={processing}>
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
              ) : actionDialog.action === 'import' ? (
                'Import to Database'
              ) : (
                'Delete from Clerk'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
