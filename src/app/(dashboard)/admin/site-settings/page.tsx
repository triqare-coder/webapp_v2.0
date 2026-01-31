'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Settings,
  Loader2,
  RefreshCw,
  AlertCircle,
  Pencil,
  X,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfigurations, useSaveConfiguration } from '@/hooks/useConfigurations'
import { Configuration } from '@/services/configurationService'

export default function SiteSettingsPage() {
  const { configurations, loading, error, refetch } = useConfigurations()
  const { saveConfiguration, loading: saving } = useSaveConfiguration()

  // Edit mode state
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Start editing a configuration
  const handleStartEdit = (config: Configuration) => {
    setEditingKey(config.key)
    setEditValue(config.value)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingKey(null)
    setEditValue('')
  }

  // Save edited configuration
  const handleSaveEdit = async () => {
    if (!editingKey || !editValue.trim()) {
      toast.error('Value cannot be empty')
      return
    }

    const result = await saveConfiguration({
      key: editingKey,
      value: editValue.trim()
    })

    if (result) {
      toast.success(`Configuration "${editingKey}" updated successfully`)
      setEditingKey(null)
      setEditValue('')
      refetch()
    } else {
      toast.error('Failed to update configuration')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Site Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system-wide configuration settings
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* All Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>All Configurations</CardTitle>
          <CardDescription>
            Overview of all system configuration values
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No configurations found.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Key</th>
                    <th className="text-left p-3 font-medium">Value</th>
                    <th className="text-left p-3 font-medium">Last Updated</th>
                    <th className="text-right p-3 font-medium w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations.map((config) => (
                    <tr key={config.key} className="border-t hover:bg-muted/50">
                      <td className="p-3 font-mono text-xs">{config.key}</td>
                      <td className="p-3">
                        {editingKey === config.key ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 max-w-[200px]"
                            autoFocus
                          />
                        ) : (
                          config.value
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(config.updated_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        {editingKey === config.key ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                              title="Save"
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 p-0"
                              title="Cancel"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(config)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

