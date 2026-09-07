import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { SOS_ACTIVE_STATUSES } from '@/lib/sosStatus'
import { getDriverPresence, summarisePresence } from '@/lib/driverPresence'
import { fetchPushReachability } from '@/lib/driverReachability'

/**
 * Admin dashboard metrics.
 *
 * Every number here is read from the live tables. Three traps this route used to
 * fall into, all of which showed the admin a confident wrong figure rather than
 * an error:
 *   - it counted users from `user_records`, a table that does not exist (404 →
 *     count null → "0 users");
 *   - it filtered SOS by the legacy lowercase statuses (`completed`/`cancelled`),
 *     which match nothing, so every request ever raised counted as "active";
 *   - it derived response time from `sos_requests.created_at`, a column that does
 *     not exist either, and on the resulting error fell back to a hardcoded
 *     "4.2 min".
 * The canonical status list lives in src/lib/sosStatus.ts; the real timestamp
 * columns are requested_at / assigned_at / completed_at.
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (gate.error) return gate.error

    const supabase = await createClient()

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      { count: totalUsers },
      { count: totalPatients },
      { count: totalHospitals },
      { count: totalDrivers },
      { count: activeEmergencies },
      { count: completedToday },
      { count: recentSOS },
      { count: recentUsers },
      { data: usersByRole },
      { data: dispatched, error: dispatchedError },
      { data: driverPresenceRows },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('hospitals').select('*', { count: 'exact', head: true }),
      supabase.from('drivers').select('*', { count: 'exact', head: true }),
      // Active = anything not in a terminal state (Arrived at Hospital / Cancelled / Timed Out).
      supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', SOS_ACTIVE_STATUSES as unknown as string[]),
      supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Arrived at Hospital')
        .gte('completed_at', todayStart.toISOString()),
      supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .gte('requested_at', yesterday.toISOString()),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString()),
      supabase.from('users').select('role'),
      // Response time = SOS raised → driver assigned, over the most recent
      // dispatches. Requests that never found a driver have no assigned_at and
      // are excluded rather than counted as instant.
      supabase
        .from('sos_requests')
        .select('requested_at, assigned_at')
        .not('assigned_at', 'is', null)
        .order('requested_at', { ascending: false })
        .limit(100),
      // Who is actually on duty right now. The fleet is small enough to read in
      // full; the derivation lives in src/lib/driverPresence.ts so the admin,
      // transport and ER dashboards all answer "online" the same way.
      supabase
        .from('drivers')
        .select('user_id, status, last_updated_at, current_request_id'),
    ])

    // Average dispatch time. 'N/A' when nothing has been dispatched yet — a
    // made-up placeholder here is worse than an honest blank.
    let avgResponseTime = 'N/A'
    if (dispatchedError) {
      console.warn('Could not compute avg response time:', dispatchedError.message)
    } else if (dispatched && dispatched.length > 0) {
      const minutes = dispatched
        .map((sos) => {
          const requested = new Date(sos.requested_at).getTime()
          const assigned = new Date(sos.assigned_at as string).getTime()
          return (assigned - requested) / 60000
        })
        .filter((m) => Number.isFinite(m) && m >= 0)

      if (minutes.length > 0) {
        const avg = minutes.reduce((sum, m) => sum + m, 0) / minutes.length
        avgResponseTime = `${avg.toFixed(1)} min`
      }
    }

    const roleDistribution =
      usersByRole?.reduce((acc: Record<string, number>, user) => {
        const role = user.role || 'unknown'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {}) || {}

    // Push reachability. A driver's `available` flag survives a force-quit, so on
    // its own it cannot say whether dispatch would reach them — six of the
    // seventeen drivers claiming 'available' on live have no token at all. Only
    // the drivers who declare themselves on duty need looking up.
    const tokenUserIds = await fetchPushReachability(
      supabase,
      (driverPresenceRows || []).filter((d) => d.status === 'available').map((d) => d.user_id),
    )

    const presenceInputs = (driverPresenceRows || []).map((d) => ({
      userId: d.user_id as string,
      status: d.status,
      lastUpdatedAt: d.last_updated_at,
      currentRequestId: d.current_request_id,
      // A failed lookup must not turn the whole fleet red — but it must not
      // paint it green either: null reads as 'Duty unknown'.
      hasPushToken: tokenUserIds ? tokenUserIds.has(d.user_id) : null,
    }))

    const driverPresence = summarisePresence(presenceInputs)

    // "Which drivers are online" needs names, not just a count — the admin
    // dashboard could previously only show a tally, so the answer to "who?" was
    // a different page. Only the dispatchable and the misconfigured are listed;
    // signed-out drivers are a roster question, not a duty one.
    const rosterIds = presenceInputs
      .filter((d) => getDriverPresence(d).presence !== 'offline')
      .map((d) => d.userId)

    const { data: rosterUsers } = rosterIds.length > 0
      ? await supabase.from('users').select('id, full_name, phone').in('id', rosterIds)
      : { data: [] as { id: string; full_name: string | null; phone: string | null }[] }

    const rosterUserById = Object.fromEntries((rosterUsers || []).map((u) => [u.id, u]))

    const PRESENCE_RANK = { on_trip: 0, online: 1, stale: 2, unknown: 3, unreachable: 4, offline: 5 }
    const onDutyDrivers = presenceInputs
      .map((d) => {
        const p = getDriverPresence(d)
        return {
          id: d.userId,
          name: rosterUserById[d.userId]?.full_name || 'Unknown driver',
          phone: rosterUserById[d.userId]?.phone || null,
          presence: p.presence,
          label: p.label,
          dispatchable: p.dispatchable,
          minutesSinceHeartbeat: p.minutesSinceHeartbeat,
        }
      })
      .filter((d) => d.presence !== 'offline')
      .sort(
        (a, b) =>
          PRESENCE_RANK[a.presence] - PRESENCE_RANK[b.presence] ||
          a.name.localeCompare(b.name),
      )

    const stats = {
      totalUsers: totalUsers || 0,
      totalPatients: totalPatients || 0,
      totalHospitals: totalHospitals || 0,
      activeEmergencies: activeEmergencies || 0,
      totalDrivers: totalDrivers || 0,
      // The tile leads with `dispatchable`, not `online`. `online` requires a
      // location heartbeat from a foreground-only watcher, so it reads 0 for a
      // fleet whose drivers all have the app pocketed — a true number that
      // answers the wrong question. See src/lib/driverPresence.ts.
      driversDispatchable: driverPresence.dispatchable,
      driversOnline: driverPresence.online,
      driversOnTrip: driverPresence.on_trip,
      driversStale: driverPresence.stale,
      driversUnreachable: driverPresence.unreachable,
      driversOffline: driverPresence.offline,
      onDutyDrivers,
      completedToday: completedToday || 0,
      avgResponseTime,
      roleDistribution,
      recentActivity: {
        newSOS: recentSOS || 0,
        newUsers: recentUsers || 0,
      },
    }

    return NextResponse.json({
      stats,
      success: true
    })
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch admin dashboard stats',
        success: false
      },
      { status: 500 }
    )
  }
}
