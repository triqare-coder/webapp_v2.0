import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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

    // Get total drivers for this transport company
    const { count: totalDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('transport_company_id', transportCompany.user_id)

    // Get available drivers
    const { count: availableDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('transport_company_id', transportCompany.user_id)
      .eq('status', 'available')

    // Get busy drivers (assigned + on_trip)
    const { count: assignedDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('transport_company_id', transportCompany.user_id)
      .eq('status', 'assigned')

    const { count: onTripDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('transport_company_id', transportCompany.user_id)
      .eq('status', 'on_trip')

    const busyDrivers = (assignedDrivers || 0) + (onTripDrivers || 0)

    // Get offline/inactive drivers
    const { count: offlineDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('transport_company_id', transportCompany.user_id)
      .eq('status', 'inactive')

    // Get all drivers for this company to check assignments
    const { data: companyDrivers } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('transport_company_id', transportCompany.user_id)

    const driverIds = companyDrivers?.map(d => d.user_id) || []

    // Get active assignments (SOS requests assigned to this company's drivers)
    let activeAssignments = 0
    if (driverIds.length > 0) {
      const { count } = await supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .in('assigned_driver_id', driverIds)
        .in('status', ['pending', 'driver_assigned', 'in_progress', 'driver_on_the_way'])
      activeAssignments = count || 0
    }

    // Get completed trips today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let completedToday = 0
    if (driverIds.length > 0) {
      const { count } = await supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .in('assigned_driver_id', driverIds)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())
        .lt('completed_at', tomorrow.toISOString())
      completedToday = count || 0
    }

    // Get total completed trips this month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    let completedThisMonth = 0
    if (driverIds.length > 0) {
      const { count } = await supabase
        .from('sos_requests')
        .select('*', { count: 'exact', head: true })
        .in('assigned_driver_id', driverIds)
        .eq('status', 'completed')
        .gte('completed_at', firstDayOfMonth.toISOString())
      completedThisMonth = count || 0
    }

    // Calculate average response time for this company's drivers
    let avgResponseTime = 'N/A'
    if (driverIds.length > 0) {
      const { data: completedSOS } = await supabase
        .from('sos_requests')
        .select('requested_at, assigned_at')
        .in('assigned_driver_id', driverIds)
        .eq('status', 'completed')
        .not('assigned_at', 'is', null)
        .order('requested_at', { ascending: false })
        .limit(50)

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
    }

    // Get recent driver activity
    const { data: recentDrivers } = await supabase
      .from('drivers')
      .select(`
        user_id,
        license_number,
        status,
        last_updated_at,
        users!drivers_user_id_fkey (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('transport_company_id', transportCompany.user_id)
      .order('last_updated_at', { ascending: false })
      .limit(5)

    // Calculate performance metrics
    const totalTrips = completedThisMonth || 0
    const totalRequests = activeAssignments + totalTrips
    const successRate = totalRequests > 0 ? `${((totalTrips / totalRequests) * 100).toFixed(1)}%` : 'N/A'

    const stats = {
      totalDrivers: totalDrivers || 0,
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
        driver_name: driver.users?.full_name || 'Unknown',
        action: `Status: ${driver.status}`,
        timestamp: driver.last_updated_at
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
