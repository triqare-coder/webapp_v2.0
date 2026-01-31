'use client'

import { useState, useEffect } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Database,
  Users,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface SyncStatus {
  clerkUsers: number
  databaseUsers: number
  inSync: boolean
  difference: number
  lastSyncCheck: string
}

interface DatabaseStats {
  total: number
  byRole: Record<string, number>
  recentUsers: number
}

interface SyncResults {
  total: number
  synced: number
  updated: number
  created: number
  errors: string[]
}

export default function DatabaseManagementPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [showDuplicates, setShowDuplicates] = useState(false)

  const loadSyncStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/sync')
      const data = await response.json()

      if (data.success) {
        setSyncStatus(data.syncStatus)
        setDatabaseStats(data.databaseStats)
      } else {
        toast.error('Failed to load sync status')
      }
    } catch (error) {
      console.error('Error loading sync status:', error)
      toast.error('Failed to load sync status')
    } finally {
      setLoading(false)
    }
  }

  const performSync = async () => {
    setSyncing(true)
    setSyncResults(null)
    try {
      const response = await fetch('/api/admin/users/sync', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setSyncResults(data.results)
        toast.success(data.message)
        // Reload status after sync
        await loadSyncStatus()
      } else {
        toast.error('Failed to sync users')
      }
    } catch (error) {
      console.error('Error syncing users:', error)
      toast.error('Failed to sync users')
    } finally {
      setSyncing(false)
    }
  }

  const loadDuplicates = async () => {
    try {
      const response = await fetch('/api/admin/users/cleanup')
      const data = await response.json()

      if (data.success) {
        setDuplicates(data.duplicates)
        setShowDuplicates(true)
      } else {
        toast.error('Failed to load duplicates')
      }
    } catch (error) {
      console.error('Error loading duplicates:', error)
      toast.error('Failed to load duplicates')
    }
  }

  const performCleanup = async () => {
    setCleaning(true)
    try {
      const response = await fetch('/api/admin/users/cleanup', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast.success(`Cleaned up ${data.cleaned} duplicate users`)
        setDuplicates([])
        setShowDuplicates(false)
        // Reload status after cleanup
        await loadSyncStatus()
      } else {
        toast.error('Failed to cleanup duplicates')
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error)
      toast.error('Failed to cleanup duplicates')
    } finally {
      setCleaning(false)
    }
  }

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const getSyncStatusColor = () => {
    if (!syncStatus) return 'bg-gray-100 text-gray-800'
    if (syncStatus.inSync) return 'bg-green-100 text-green-800'
    if (Math.abs(syncStatus.difference) <= 2) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getSyncStatusIcon = () => {
    if (!syncStatus) return <Settings className="h-4 w-4" />
    if (syncStatus.inSync) return <CheckCircle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const getSyncProgress = () => {
    if (!syncStatus) return 0
    if (syncStatus.clerkUsers === 0) return 100
    return (syncStatus.databaseUsers / syncStatus.clerkUsers) * 100
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
            <p className="text-gray-600">Manage user data synchronization between Clerk and database</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={loadDuplicates} disabled={loading} variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Check Duplicates
            </Button>
            <Button onClick={loadSyncStatus} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={performSync} disabled={syncing || loading}>
              {syncing ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Sync All Users
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sync Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {syncStatus?.clerkUsers || 0}
                  </p>
                  <p className="text-xs text-gray-600">Clerk Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {syncStatus?.databaseUsers || 0}
                  </p>
                  <p className="text-xs text-gray-600">Database Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getSyncStatusIcon()}
                <div>
                  <p className="text-2xl font-bold">
                    {syncStatus?.difference || 0}
                  </p>
                  <p className="text-xs text-gray-600">Difference</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {databaseStats?.recentUsers || 0}
                  </p>
                  <p className="text-xs text-gray-600">Recent (7 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Status Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Synchronization Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={getSyncStatusColor()}>
                  {getSyncStatusIcon()}
                  <span className="ml-2">
                    {syncStatus?.inSync ? 'In Sync' : 'Out of Sync'}
                  </span>
                </Badge>
                {syncStatus && (
                  <span className="text-sm text-gray-600">
                    Last checked: {new Date(syncStatus.lastSyncCheck).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sync Progress</span>
                <span>{Math.round(getSyncProgress())}%</span>
              </div>
              <Progress value={getSyncProgress()} className="h-2" />
            </div>

            {syncStatus && !syncStatus.inSync && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  {syncStatus.difference > 0
                    ? `${syncStatus.difference} users in Clerk are not synced to the database.`
                    : `${Math.abs(syncStatus.difference)} users in database don't exist in Clerk.`
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Distribution */}
        {databaseStats && (
          <Card>
            <CardHeader>
              <CardTitle>User Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(databaseStats.byRole).map(([role, count]) => (
                  <div key={role} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {role.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Results */}
        {syncResults && (
          <Card>
            <CardHeader>
              <CardTitle>Last Sync Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{syncResults.total}</div>
                  <div className="text-sm text-gray-600">Total Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{syncResults.created}</div>
                  <div className="text-sm text-gray-600">Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{syncResults.updated}</div>
                  <div className="text-sm text-gray-600">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{syncResults.errors.length}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>

              {syncResults.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-800 mb-2">Sync Errors:</h4>
                  <div className="space-y-1">
                    {syncResults.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Duplicate Users Management */}
        {showDuplicates && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>Duplicate Users Found</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={performCleanup}
                    disabled={cleaning || duplicates.length === 0}
                    variant="destructive"
                    size="sm"
                  >
                    {cleaning ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Cleaning...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Clean Up All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowDuplicates(false)}
                    variant="outline"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {duplicates.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Duplicates Found</h3>
                  <p className="text-gray-600">All users have unique email addresses.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">
                        Found {duplicates.length} duplicate email addresses affecting {duplicates.reduce((sum, dup) => sum + dup.count, 0)} users
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      These duplicates can cause sync issues. Click "Clean Up All" to automatically remove older duplicate entries.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {duplicates.map((duplicate, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900">{duplicate.email}</span>
                          <span className="ml-2 text-sm text-gray-600">
                            ({duplicate.count} duplicates)
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          User IDs: {duplicate.user_ids.slice(0, 2).join(', ')}
                          {duplicate.user_ids.length > 2 && ` +${duplicate.user_ids.length - 2} more`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  )
}
