import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthedUser } from '@/lib/supabase/server'
import { summarisePresence } from '@/lib/driverPresence'
import { fetchPushReachability } from '@/lib/driverReachability'

// Canonical "completed" SOS state (an SOS reaching the hospital). Legacy 'completed'
// does not exist in the live sos_requests status enum.
const COMPLETED_STATUS = 'Arrived at Hospital'

export async function GET(request: NextRequest) {
  try {
    const { user, appUser } = await getAuthedUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // appUser IS the caller's public.users row
    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const currentUser: any = appUser
    const supabase = await createClient()

    if (currentUser.role !== 'transport_company') {
      return NextResponse.json(
        { error: 'Only transport companies can access this endpoint' },
        { status: 403 }
      )
    }

    // Get transport company for this user
    const { data: transportCompany, error: companyError } = await supabase
      .from('transport_companies')
      .select('user_id, company_name, is_verified, registration_number')
      .eq('user_id', currentUser.id)
      .single()

    if (companyError || !transportCompany) {
      return NextResponse.json(
        { error: 'Transport company not found' },
        { status: 404 }
      )
    }

    // Every driver figure on the dashboard comes from one read of this company's
    // driver rows. It used to be six separate count queries awaited in sequence —
    // ~150ms each against a table holding 27 rows fleet-wide, so the tiles cost
    // roughly a second of round trips to count something the route could add up
    // itself.
    const { data: companyDrivers } = await supabase
      .from('drivers')
      .select('user_id, status, last_updated_at, current_request_id')
      .eq('transport_company_id', transportCompany.user_id)

    const driverRows = companyDrivers || []
    const driverIds = driverRows.map(d => d.user_id)

    const totalDrivers = driverRows.length
    const availableDrivers = driverRows.filter(d => d.status === 'available').length
    const busyDrivers = driverRows.filter(
      d => d.status === 'assigned' || d.status === 'on_trip'
    ).length
    const offlineDrivers = driverRows.filter(d => d.status === 'inactive').length

    // `available` is a flag the driver sets once, so on its own it cannot answer
    // "who is online right now" — see src/lib/driverPresence.ts. Push
    // reachability is what survives the driver pocketing the phone, so the
    // company's on-duty drivers get their device_tokens checked.
    const tokenUserIds = await fetchPushReachability(
      supabase,
      driverRows.filter(d => d.status === 'available').map(d => d.user_id),
    )

    const presenceInputs = driverRows.map((d) => ({
      userId: d.user_id as string,
      status: d.status,
      lastUpdatedAt: d.last_updated_at,
      currentRequestId: d.current_request_id,
      // null on failure = 'Duty unknown'. Neither "all reachable" nor "all
      // unreachable" is an honest answer to a lookup that did not run.
      hasPushToken: tokenUserIds ? tokenUserIds.has(d.user_id) : null,
    }))

    const presence = summarisePresence(presenceInputs)

    // The IDs the dashboard needs to badge each driver row it renders, so the
    // client does not have to re-derive reachability without the token data.
    const unreachableDriverIds = presenceInputs
      .filter(d => d.hasPushToken === false && d.status === 'available')
      .map(d => d.userId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // The four SOS reads below are independent of each other, so they go out
    // together rather than one after the next. Canonical inline model:
    // sos_requests.driver_id; active = not in a terminal state.
    const [
      { count: activeCount },
      { count: todayCount },
      { count: monthCount },
      { data: completedSOS },
    ] = driverIds.length > 0
      ? await Promise.all([
          supabase
            .from('sos_requests')
            .select('*', { count: 'exact', head: true })
            .in('driver_id', driverIds)
            .not('status', 'in', '("Arrived at Hospital","Cancelled")'),
          supabase
            .from('sos_requests')
            .select('*', { count: 'exact', head: true })
            .in('driver_id', driverIds)
            .eq('status', COMPLETED_STATUS)
            .gte('completed_at', today.toISOString())
            .lt('completed_at', tomorrow.toISOString()),
          supabase
            .from('sos_requests')
            .select('*', { count: 'exact', head: true })
            .in('driver_id', driverIds)
            .eq('status', COMPLETED_STATUS)
            .gte('completed_at', firstDayOfMonth.toISOString()),
          supabase
            .from('sos_requests')
            .select('requested_at, assigned_at')
            .in('driver_id', driverIds)
            .eq('status', COMPLETED_STATUS)
            .not('assigned_at', 'is', null)
            .order('requested_at', { ascending: false })
            .limit(50),
        ])
      : [
          { count: 0 },
          { count: 0 },
          { count: 0 },
          { data: [] as { requested_at: string; assigned_at: string | null }[] },
        ]

    const activeAssignments = activeCount || 0
    const completedToday = todayCount || 0
    const completedThisMonth = monthCount || 0

    // Average response time for this company's drivers.
    let avgResponseTime = 'N/A'
    if (completedSOS && completedSOS.length > 0) {
      const totalResponseTime = completedSOS.reduce((sum, sos) => {
        const requested = new Date(sos.requested_at)
        const assigned = new Date(sos.assigned_at!)
        const diffMinutes = (assigned.getTime() - requested.getTime()) / (1000 * 60)
        return sum + diffMinutes
      }, 0)
      const avgMinutes = totalResponseTime / completedSOS.length
      avgResponseTime = `${avgMinutes.toFixed(1)} min`
    }

    // Get recent driver activity. NOTE: avoid PostgREST nested embeds (FK relationships
    // are not in this DB's schema cache → embeds 500); fetch driver rows then batch-fetch
    // user identities and merge in JS. Order by updated_at (the real column).
    const { data: recentDrivers } = await supabase
      .from('drivers')
      .select('user_id, license_number, status, updated_at')
      .eq('transport_company_id', transportCompany.user_id)
      .order('updated_at', { ascending: false })
      .limit(5)

    const recentDriverUserIds = [...new Set((recentDrivers || []).map(d => d.user_id).filter(Boolean))]
    const { data: recentDriverUsers } = recentDriverUserIds.length > 0
      ? await supabase.from('users').select('id, full_name, email, phone').in('id', recentDriverUserIds)
      : { data: [] as any[] }
    const recentDriverUserById = Object.fromEntries((recentDriverUsers || []).map((u: any) => [u.id, u]))

    // Calculate performance metrics
    const totalTrips = completedThisMonth || 0
    const totalRequests = activeAssignments + totalTrips
    const successRate = totalRequests > 0 ? `${((totalTrips / totalRequests) * 100).toFixed(1)}%` : 'N/A'

    const stats = {
      totalDrivers: totalDrivers || 0,
      // Lead with the drivers dispatch can actually reach. `onlineDrivers`
      // requires a live GPS heartbeat from a foreground-only watcher, so it
      // reads 0 whenever the fleet has the app pocketed — see driverPresence.ts.
      dispatchableDrivers: presence.dispatchable,
      onlineDrivers: presence.online,
      staleDrivers: presence.stale,
      unreachableDrivers: presence.unreachable,
      unreachableDriverIds,
      availableDrivers: availableDrivers || 0,
      busyDrivers: busyDrivers,
      offlineDrivers: offlineDrivers || 0,
      activeAssignments: activeAssignments,
      completedToday: completedToday,
      completedThisMonth: completedThisMonth,
      avgResponseTime,
      performanceMetrics: {
        successRate,
        customerRating: 'N/A' // Can be calculated from feedback if available
      },
      recentActivity: (recentDrivers || []).map((driver: any) => ({
        id: driver.user_id,
        driver_name: recentDriverUserById[driver.user_id]?.full_name || 'Unknown',
        action: `Status: ${driver.status}`,
        timestamp: driver.updated_at
      }))
    }

    return NextResponse.json({
      stats,
      success: true
    })
  } catch (error) {
    console.error('Error fetching transport dashboard stats:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch transport dashboard stats',
        success: false 
      },
      { status: 500 }
    )
  }
}
