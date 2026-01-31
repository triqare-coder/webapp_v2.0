'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Users, Database, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { OrphanedUsersManager } from './OrphanedUsersManager'

interface SyncStatus {
  clerk: {
    count: number
    status: string
  }
  database: {
    count: number
    status: string
  }
  sync: {
    inSync: boolean
    orphanedUsers: number
    lastCheck: string
    error?: string
  }
}

interface SyncResult {
  success: boolean
  message: string
  details: {
    total: number
    synced: number
    errors: string[]
    skipped: number
  }
}

export function SyncManager() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sync' | 'orphaned' | 'report'>('sync')

  const loadStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/sync')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.status)
      } else {
        toast.error('Failed to load sync status')
      }
    } catch (error) {
      toast.error('Failed to load sync status')
    } finally {
      setLoading(false)
    }
  }

  const performSync = async (action: string, description: string) => {
    try {
      setSyncing(action)
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        await loadStatus() // Refresh status
      } else {
        toast.error(data.message || `Failed to ${description}`)
      }
    } catch (error) {
      toast.error(`Failed to ${description}`)
    } finally {
      setSyncing(null)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const getStatusIcon = (inSync: boolean, hasError: boolean) => {
    if (hasError) return <XCircle className="h-5 w-5 text-red-500" />
    if (inSync) return <CheckCircle className="h-5 w-5 text-green-500" />
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusBadge = (inSync: boolean, hasError: boolean) => {
    if (hasError) return <Badge variant="destructive">Error</Badge>
    if (inSync) return <Badge variant="default" className="bg-green-500">In Sync</Badge>
    return <Badge variant="secondary">Out of Sync</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Management</h2>
          <p className="text-muted-foreground">
            Manage synchronization between Clerk and your database
          </p>
        </div>
        <Button
          onClick={loadStatus}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sync'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <RefreshCw className="h-4 w-4 mr-2 inline" />
          Sync Status
        </button>
        <button
          onClick={() => setActiveTab('orphaned')}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'orphaned'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-4 w-4 mr-2 inline" />
          Orphaned Users {status?.sync.orphanedUsers ? `(${status.sync.orphanedUsers})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'report'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 mr-2 inline" />
          Detailed Report
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'sync' && status && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
          {/* Clerk Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clerk Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.clerk.count}</div>
              <p className="text-xs text-muted-foreground">
                Status: {status.clerk.status}
              </p>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Users</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.database.count}</div>
              <p className="text-xs text-muted-foreground">
                Status: {status.database.status}
              </p>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              {getStatusIcon(status.sync.inSync, !!status.sync.error)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getStatusBadge(status.sync.inSync, !!status.sync.error)}
                {status.sync.orphanedUsers > 0 && (
                  <p className="text-xs text-yellow-600">
                    {status.sync.orphanedUsers} orphaned users
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Last check: {new Date(status.sync.lastCheck).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          </div>

          <Card>
            <CardHeader>
          <CardTitle>Sync Actions</CardTitle>
          <CardDescription>
            Perform manual synchronization between Clerk and your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={() => performSync('clerk-to-db', 'sync from Clerk to Database')}
              disabled={syncing !== null}
              variant="outline"
              className="justify-start"
            >
              {syncing === 'clerk-to-db' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              <Users className="h-4 w-4 mr-2" />
              Sync Clerk → Database
            </Button>

            <Button
              onClick={() => performSync('db-to-clerk', 'sync from Database to Clerk')}
              disabled={syncing !== null}
              variant="outline"
              className="justify-start"
            >
              {syncing === 'db-to-clerk' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              <Database className="h-4 w-4 mr-2" />
              Sync Database → Clerk
            </Button>
          </div>

          <Separator />

          <Button
            onClick={() => performSync('full-sync', 'perform full bidirectional sync')}
            disabled={syncing !== null}
            className="w-full"
          >
            {syncing === 'full-sync' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Full Bidirectional Sync
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Information */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Automatic sync is enabled via Clerk webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Webhook URL:</strong> {window.location.origin}/api/webhooks/clerk
            </p>
            <p className="text-sm text-muted-foreground">
              Configure this URL in your Clerk dashboard to enable automatic synchronization
              when users are created, updated, or deleted in Clerk.
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-1">Required Webhook Events:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• user.created</li>
                <li>• user.updated</li>
                <li>• user.deleted</li>
              </ul>
            </div>
          </div>
        </CardContent>
          </Card>
        </div>
      )}

      {/* Orphaned Users Tab */}
      {activeTab === 'orphaned' && (
        <OrphanedUsersManager />
      )}

      {/* Detailed Report Tab */}
      {activeTab === 'report' && (
        <DetailedSyncReport />
      )}
    </div>
  )
}

// Detailed Sync Report Component
function DetailedSyncReport() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/sync-report')
      const data = await response.json()

      if (data.success) {
        setReport(data.report)
      } else {
        toast.error('Failed to load sync report')
      }
    } catch (error) {
      toast.error('Failed to load sync report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading detailed sync report...</p>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p>Failed to load sync report</p>
          <Button onClick={loadReport} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Summary</CardTitle>
          <CardDescription>
            Comprehensive overview of synchronization status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{report.summary.clerkUsers}</div>
              <div className="text-sm text-muted-foreground">Clerk Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{report.summary.databaseUsers}</div>
              <div className="text-sm text-muted-foreground">Database Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{report.summary.orphanedUsers}</div>
              <div className="text-sm text-muted-foreground">Orphaned Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{report.summary.missingInDatabase}</div>
              <div className="text-sm text-muted-foreground">Missing in DB</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Badge variant={report.summary.inSync ? "default" : "destructive"}>
              {report.summary.inSync ? "✅ In Sync" : "⚠️ Out of Sync"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {report.details.orphanedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Users ({report.details.orphanedUsers.length})</CardTitle>
            <CardDescription>Users in database but not in Clerk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.details.orphanedUsers.slice(0, 5).map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{user.full_name || user.email}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
              ))}
              {report.details.orphanedUsers.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {report.details.orphanedUsers.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {report.details.missingInDatabase.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Missing in Database ({report.details.missingInDatabase.length})</CardTitle>
            <CardDescription>Users in Clerk but not in database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.details.missingInDatabase.slice(0, 5).map((user: any) => (
                <div key={user.clerk_user_id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  <Badge variant="outline">Clerk Only</Badge>
                </div>
              ))}
              {report.details.missingInDatabase.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {report.details.missingInDatabase.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(report.lastCheck).toLocaleString()}
          </div>
          <Button onClick={loadReport} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
