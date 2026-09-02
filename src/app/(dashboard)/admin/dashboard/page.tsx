'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { DownloadAppButton } from '@/components/DownloadAppButton'
import {
  Users,
  Building2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  Shield,
  Database,
  Settings,
  BarChart3,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  formatLastSeen,
  PRESENCE_BADGE_CLASS,
  PRESENCE_STALE_MINUTES,
  type DriverPresence,
} from '@/lib/driverPresence'

interface OnDutyDriver {
  id: string
  name: string
  phone: string | null
  presence: DriverPresence
  label: string
  dispatchable: boolean
  minutesSinceHeartbeat: number | null
}

interface AdminDashboardStats {
  totalUsers: number
  totalPatients: number
  totalHospitals: number
  activeEmergencies: number
  totalDrivers: number
  driversDispatchable: number
  driversOnline: number
  driversOnTrip: number
  driversStale: number
  driversUnreachable: number
  driversOffline: number
  onDutyDrivers: OnDutyDriver[]
  completedToday: number
  avgResponseTime: string
  roleDistribution: Record<string, number>
  recentActivity: {
    newSOS: number
    newUsers: number
  }
}

// Soft Healthcare palette helpers
const TINT = {
  navy: 'bg-[#ccd9e6] text-[#003366]',
  red: 'bg-[#f5cccc] text-[#cc3333]',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
} as const

const CARD = 'rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,51,102,0.05)]'

function StatCard({ label, value, sub, icon: Icon, tint }: {
  label: string; value: React.ReactNode; sub: string; icon: typeof Users; tint: keyof typeof TINT
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${TINT[tint]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { appUser } = useAuth()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard stats')
      }

      if (data.success) {
        // A cached response from before the roster shipped has no onDutyDrivers;
        // defaulting it here keeps the panel empty instead of white-screening on
        // `.length`.
        setStats({ ...data.stats, onDutyDrivers: data.stats.onDutyDrivers ?? [] })
      } else {
        throw new Error(data.error || 'Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const recentActivities = [
    {
      id: 1,
      action: 'New Registrations',
      details: `${stats?.recentActivity.newUsers ?? 0} new users registered in the last 24 hours`,
      timestamp: 'Last 24 hours',
      type: 'user',
    },
    {
      id: 2,
      action: 'Emergency Activity',
      details: `${stats?.recentActivity.newSOS ?? 0} new SOS requests in the last 24 hours`,
      timestamp: 'Last 24 hours',
      type: 'emergency',
    },
    {
      id: 3,
      action: 'Resolved Today',
      details: `${stats?.completedToday ?? 0} emergencies reached hospital today`,
      timestamp: 'Today',
      type: 'system',
    },
  ]

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin']}>
        <div className="space-y-6">
          <LoadingSkeleton />
        </div>
      </RoleGuard>
    )
  }

  if (error || !stats) {
    return (
      <RoleGuard allowedRoles={['admin']}>
        <div className={`${CARD} mx-auto mt-6 max-w-md p-10 text-center`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5cccc]">
            <AlertTriangle className="h-7 w-7 text-[#cc3333]" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Failed to Load Dashboard</h2>
          <p className="mb-5 text-sm text-slate-500">{error}</p>
          <Button onClick={fetchDashboardStats} className="rounded-full bg-[#cc3333] hover:bg-[#b32d2d]">
            Try Again
          </Button>
        </div>
      </RoleGuard>
    )
  }

  const firstName = appUser?.firstName

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6">
        {/* Header / greeting */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-slate-500">A live view of the response network today.</p>
          </div>
          <div className="flex items-center gap-3">
            <DownloadAppButton />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccd9e6]/60 px-3 py-1.5 text-xs font-semibold text-[#003366]">
              <Shield className="h-3.5 w-3.5" />
              System Administrator
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.recentActivity.newUsers} new in last 24h`} icon={Users} tint="navy" />
          <StatCard label="Patients" value={stats.totalPatients} sub="Registered patients" icon={Activity} tint="navy" />
          <StatCard label="Hospitals" value={stats.totalHospitals} sub="Across the network" icon={Building2} tint="navy" />
          <StatCard label="Active Emergencies" value={stats.activeEmergencies} sub={stats.activeEmergencies > 0 ? 'Requires attention' : 'All clear'} icon={AlertTriangle} tint="red" />
          <StatCard label="Avg Response Time" value={stats.avgResponseTime} sub="SOS raised to driver assigned" icon={Clock} tint="amber" />
          {/* "Total Drivers" alone never answered the question operations actually
              asks — who can be dispatched right now. This tile counts the drivers
              dispatch would actually reach, NOT the ones sending live GPS: the
              location heartbeat is foreground-only, so "online" reads 0 across the
              whole fleet the moment drivers pocket their phones. Live GPS is shown
              as a subset instead. See src/lib/driverPresence.ts. */}
          <StatCard
            label="Drivers On Duty"
            value={stats.driversDispatchable}
            sub={`${stats.driversOnTrip} on trip · ${stats.driversOnline} sending live GPS · ${stats.totalDrivers} registered`}
            icon={UserCheck}
            tint="emerald"
          />
          <StatCard label="Resolved Today" value={stats.completedToday} sub="Reached hospital today" icon={TrendingUp} tint="emerald" />
          <StatCard label="SOS (24h)" value={stats.recentActivity.newSOS} sub="Raised in last 24 hours" icon={Shield} tint="red" />
        </div>

        {/* Who, not just how many. The tile above can say "11 on duty" and still
            leave the admin unable to name one of them; this is the list that
            question was really asking for. Signed-out drivers are omitted — they
            are a roster question, answered on /admin/drivers. */}
        <div className={`${CARD} p-6`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Drivers On Duty</h2>
              <p className="text-xs text-slate-500">
                Reachable by dispatch now · live GPS means a position in the last{' '}
                {PRESENCE_STALE_MINUTES} min
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/drivers">All drivers</Link>
            </Button>
          </div>

          {stats.driversUnreachable > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#cc3333]" />
              <p className="text-sm text-[#cc3333]">
                <span className="font-semibold">
                  {stats.driversUnreachable} driver{stats.driversUnreachable === 1 ? '' : 's'} on
                  duty with no app signal.
                </span>{' '}
                They are marked available but have no registered device, so an SOS push
                cannot reach them. They need to sign in to the app again.
              </p>
            </div>
          )}

          {stats.onDutyDrivers.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {stats.onDutyDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{driver.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {driver.phone || 'No phone on file'} · last position{' '}
                      {formatLastSeen(driver.minutesSinceHeartbeat)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${PRESENCE_BADGE_CLASS[driver.presence]}`}
                  >
                    {driver.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No drivers are on duty right now. {stats.totalDrivers} registered, all signed out.
            </p>
          )}
        </div>

        {/* System Overview + Role distribution */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className={`${CARD} p-6 lg:col-span-2`}>
            <h2 className="mb-4 text-base font-bold text-slate-900">System Overview</h2>
            <div className="space-y-2.5">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activity.type === 'emergency' ? TINT.red : activity.type === 'system' ? TINT.navy : TINT.navy}`}>
                    {activity.type === 'user' && <Users className="h-4 w-4" />}
                    {activity.type === 'system' && <Settings className="h-4 w-4" />}
                    {activity.type === 'emergency' && <AlertTriangle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                    <p className="truncate text-xs text-slate-500">{activity.details}</p>
                  </div>
                  <span className="text-xs text-slate-400">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${CARD} p-6`}>
            <h2 className="mb-4 text-base font-bold text-slate-900">User Roles</h2>
            {Object.keys(stats.roleDistribution).length > 0 ? (
              <div className="space-y-3.5">
                {Object.entries(stats.roleDistribution).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-slate-500">{role.replace('_', ' ')}</span>
                    <span className="text-lg font-bold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No role data available.</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className={`${CARD} p-6`}>
          <h2 className="mb-4 text-base font-bold text-slate-900">Administrative Actions</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { href: '/admin/users', label: 'Manage Users', icon: Users },
              { href: '/admin/hospitals', label: 'Hospital Settings', icon: Building2 },
              { href: '/admin/reports', label: 'System Reports', icon: BarChart3 },
              { href: '/admin/transport-companies', label: 'Data Management', icon: Database },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-[#003366]/20 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ccd9e6]">
                  <a.icon className="h-5 w-5 text-[#003366]" />
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
