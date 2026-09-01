'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Map,
  MapPin,
  Navigation,
  RefreshCw,
  UserCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useERTDriversRealtime } from '@/hooks/useERTDriversRealtime'
import { useSOSRequestsRealtime } from '@/hooks/useSOSRequestsRealtime'
import { isActiveStatus } from '@/lib/sosStatus'
import { PRESENCE_STALE_MINUTES } from '@/lib/driverPresence'

/**
 * Live Monitoring Center.
 *
 * Every figure on this page used to be a string literal — "12 units online",
 * "15 on duty", "8.5 min", "98.5% coverage", "99.9% uptime" — alongside four
 * invented alerts and six buttons wired to nothing. It looked like the most
 * authoritative screen in the ER dashboard and was the only one carrying no data
 * at all, which is worse than an empty state: dispatch cannot tell a quiet night
 * from a broken feed. Everything below now comes from the same realtime hooks the
 * rest of the ER dashboard uses, and controls that were never implemented are
 * gone rather than left as decoration.
 */
export default function MonitoringPage() {
  const {
    drivers,
    stats: driverStats,
    loading: driversLoading,
    isConnected: driversConnected,
    refetch: refetchDrivers,
  } = useERTDriversRealtime({ enabled: true })

  const {
    sosRequests,
    loading: sosLoading,
    isConnected: sosConnected,
    refetch: refetchSOS,
  } = useSOSRequestsRealtime({ enabled: true, playAlertSound: false })

  const loading = driversLoading || sosLoading

  const activeEmergencies = useMemo(
    () => sosRequests.filter((sos) => isActiveStatus(sos.status)),
    [sosRequests],
  )

  // Dispatch time over the requests that actually found a driver. Requests that
  // timed out have no assigned_at and are excluded rather than counted as instant.
  const avgDispatch = useMemo(() => {
    const minutes = sosRequests
      .filter((sos) => sos.assigned_at)
      .map(
        (sos) =>
          (new Date(sos.assigned_at as string).getTime() -
            new Date(sos.requested_at).getTime()) /
          60000,
      )
      .filter((m) => Number.isFinite(m) && m >= 0)
      .slice(0, 100)
    if (minutes.length === 0) return 'N/A'
    return `${(minutes.reduce((a, b) => a + b, 0) / minutes.length).toFixed(1)} min`
  }, [sosRequests])

  // Most recent state changes, newest first — the real replacement for the four
  // hardcoded "system alerts".
  const recentActivity = useMemo(
    () =>
      [...sosRequests]
        .sort(
          (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
        )
        .slice(0, 6),
    [sosRequests],
  )

  const liveStats = [
    {
      title: 'Drivers Online',
      value: driverStats.online,
      description: `Reporting within ${PRESENCE_STALE_MINUTES} min`,
      icon: UserCheck,
      color: 'text-green-600',
    },
    {
      title: 'On Trip',
      value: driverStats.busy,
      description: 'Handling an emergency',
      icon: Navigation,
      color: 'text-blue-600',
    },
    {
      title: 'Active Emergencies',
      value: activeEmergencies.length,
      description: activeEmergencies.length > 0 ? 'Requires attention' : 'All clear',
      icon: AlertTriangle,
      color: activeEmergencies.length > 0 ? 'text-red-600' : 'text-gray-600',
    },
    {
      title: 'Avg Dispatch Time',
      value: avgDispatch,
      description: 'SOS raised → driver assigned',
      icon: Clock,
      color: 'text-amber-600',
    },
  ]

  const driversWithLocation = drivers.filter((d) => d.latitude && d.longitude).length

  const monitoringModules = [
    {
      title: 'Live Map View',
      description: 'Real-time location of every driver currently reporting a position',
      icon: Map,
      href: '/erteam/map',
      count: `${driversWithLocation} with a position`,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      title: 'Driver Status',
      description: 'Availability, presence and current assignment for every driver',
      icon: UserCheck,
      href: '/erteam/drivers',
      count: `${driverStats.online} online / ${driverStats.total} total`,
      color: 'bg-purple-100 text-purple-800',
    },
  ]

  const statusColor = (status: string) => {
    if (status === 'Cancelled' || status === 'Timed Out') return 'bg-gray-100 text-gray-800'
    if (status === 'Arrived at Hospital') return 'bg-green-100 text-green-800'
    if (status === 'SOS Triggered') return 'bg-red-100 text-red-800'
    return 'bg-blue-100 text-blue-800'
  }

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? '' : 's'} ago`
  }

  const connected = driversConnected && sosConnected

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="h-6 w-6 mr-2" />
            Live Monitoring Center
          </h1>
          <p className="text-gray-600">
            Real-time monitoring and tracking of emergency response operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Whether the feed is live is itself a fact dispatch needs: a stalled
              subscription and a quiet night look identical without it. */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchDrivers()
              refetchSOS()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {liveStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {loading ? '—' : stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Driver presence breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Driver Presence
          </CardTitle>
          <CardDescription>
            Presence comes from the driver app: an explicit Online/Offline toggle plus a
            position report roughly every 15 seconds while the app is open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{driverStats.online}</div>
              <div className="text-sm text-gray-500">Online</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{driverStats.busy}</div>
              <div className="text-sm text-gray-500">On trip</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{driverStats.stale}</div>
              <div className="text-sm text-gray-500">On duty (no signal)</div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{driverStats.offline}</div>
              <div className="text-sm text-gray-500">Offline</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Navigation className="h-5 w-5 mr-2" />
            Monitoring Modules
          </CardTitle>
          <CardDescription>Access real-time tracking and monitoring tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {monitoringModules.map((module) => (
              <Link key={module.title} href={module.href}>
                <div className="p-6 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <module.icon className="h-6 w-6 text-gray-600" />
                      </div>
                      <Badge className={module.color}>{module.count}</Badge>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                    </div>
                    <div className="flex items-center justify-end">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Recent Emergency Activity
              </CardTitle>
              <CardDescription>The latest SOS requests and where each one stands</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/erteam/sos">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
          ) : recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No SOS requests have been raised yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((sos) => (
                <Link
                  key={sos.id}
                  href={`/erteam/sos/${sos.id}`}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                >
                  <Badge className={statusColor(sos.status)}>{sos.status}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {sos.patient?.full_name || 'Unknown patient'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-4">
                      <span className="flex items-center text-xs text-gray-500">
                        <Clock className="mr-1 h-3 w-3" />
                        {timeAgo(sos.requested_at)}
                      </span>
                      <span className="flex items-center text-xs text-gray-500">
                        <MapPin className="mr-1 h-3 w-3" />
                        {sos.assigned_driver?.full_name
                          ? `Driver: ${sos.assigned_driver.full_name}`
                          : 'No driver assigned'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
