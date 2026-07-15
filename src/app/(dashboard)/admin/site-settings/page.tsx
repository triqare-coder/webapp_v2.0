'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Loader2,
  RefreshCw,
  AlertCircle,
  Pencil,
  X,
  Check,
  Timer
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfigurations, useSaveConfiguration } from '@/hooks/useConfigurations'
import { Configuration } from '@/services/configurationService'

/**
 * Config keys we surface as friendly, labeled controls (instead of the raw
 * key/value row in the table below). Add an entry here to promote any config
 * key into a first-class, documented setting.
 */
const FEATURED_SETTINGS: {
  key: string
  label: string
  description: string
  unit: string
  min: number
}[] = [
  {
    key: 'sos_request_timeout_minutes',
    label: 'SOS Reset Timer',
    description:
      'How long an emergency SOS waits for a driver before it automatically resets. When no driver is assigned within this window the request is auto-cancelled and the patient’s SOS button returns to idle. Enforced both in the patient app and by the server-side sweep.',
    unit: 'minutes',
    min: 1
  }
]

const FEATURED_KEYS = new Set(FEATURED_SETTINGS.map((s) => s.key))

/** Pull the first positive number out of a stored config value ("3", "3 min", "5.0"). */
function parseNumericValue(raw: string | undefined): number | null {
  if (!raw) return null
  const match = raw.trim().match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const n = parseFloat(match[0])
  return Number.isFinite(n) ? n : null
}

function FeaturedSettingCard({
  meta,
  config,
  onSaved
}: {
  meta: (typeof FEATURED_SETTINGS)[number]
  config: Configuration | undefined
  onSaved: () => void
}) {
  const { saveConfiguration, loading: saving } = useSaveConfiguration()
  const savedNumber = parseNumericValue(config?.value)
  const [value, setValue] = useState(savedNumber != null ? String(savedNumber) : '')

  const handleSave = async () => {
    const n = Number(value.trim())
    if (!Number.isFinite(n) || n < meta.min) {
      toast.error(`Enter a number of ${meta.unit} (at least ${meta.min}).`)
      return
    }

    // Persist a clean numeric string so downstream parsers never have to guess.
    const result = await saveConfiguration({ key: meta.key, value: String(n) })
    if (result) {
      toast.success(`${meta.label} set to ${n} ${meta.unit}.`)
      onSaved()
    } else {
      toast.error(`Failed to update ${meta.label}.`)
    }
  }

  const isDirty = value.trim() !== '' && Number(value.trim()) !== savedNumber

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              {meta.label}
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">{meta.description}</CardDescription>
          </div>
          {savedNumber != null && (
            <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
              Current: {savedNumber} {meta.unit}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`setting-${meta.key}`}>{meta.label} ({meta.unit})</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`setting-${meta.key}`}
                type="number"
                inputMode="numeric"
                min={meta.min}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 w-32"
              />
              <span className="text-sm text-muted-foreground">{meta.unit}</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
        {config?.updated_at && (
          <p className="text-xs text-muted-foreground mt-3">
            Last updated {new Date(config.updated_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

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

      {/* Featured (labeled) settings */}
      {FEATURED_SETTINGS.map((meta) => (
        <FeaturedSettingCard
          key={meta.key}
          meta={meta}
          config={configurations.find((c) => c.key === meta.key)}
          onSaved={refetch}
        />
      ))}

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
                      <td className="p-3 font-mono text-xs">
                        <span className="flex items-center gap-2">
                          {config.key}
                          {FEATURED_KEYS.has(config.key) && (
                            <Badge variant="outline" className="text-[10px]">
                              Above
                            </Badge>
                          )}
                        </span>
                      </td>
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
