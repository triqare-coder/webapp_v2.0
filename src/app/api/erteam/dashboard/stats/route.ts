import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get active emergencies (SOS requests that are not completed/cancelled)
    const { count: activeEmergencies } = await supabase
      .from('sos_requests')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(completed,cancelled)')

    // Get available ambulances (mock for now - need ambulances table)
    // For now, we'll use a calculation based on drivers
    const { count: totalDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })

    const { count: busyDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'busy')

    const availableAmbulances = Math.max(0, (totalDrivers || 0) - (busyDrivers || 0))

    // Get on-duty drivers
    const { count: onDutyDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')

    // Calculate average response time from recent completed SOS requests
    const { data: recentCompletedSOS } = await supabase
      .from('sos_requests')
      .select('created_at, updated_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    let avgResponseTime = '4.2 min'
    if (recentCompletedSOS && recentCompletedSOS.length > 0) {
      const totalResponseTime = recentCompletedSOS.reduce((sum, sos) => {
        const created = new Date(sos.created_at)
        const updated = new Date(sos.updated_at)
        const diffMinutes = (updated.getTime() - created.getTime()) / (1000 * 60)
        return sum + diffMinutes
      }, 0)
      const avgMinutes = totalResponseTime / recentCompletedSOS.length
      avgResponseTime = `${avgMinutes.toFixed(1)} min`
    }

    // Get completed cases today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { count: completedToday } = await supabase
      .from('sos_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', today.toISOString())
      .lt('updated_at', tomorrow.toISOString())

    // Get pending assignments (SOS requests without assigned drivers)
    const { count: pendingAssignments } = await supabase
      .from('sos_requests')
      .select('*', { count: 'exact', head: true })
      .is('assigned_driver_id', null)
      .not('status', 'in', '(completed,cancelled)')

    // Get recent active cases with details
    const { data: activeCases } = await supabase
      .from('sos_requests')
      .select(`
        id,
        patient_name,
        patient_phone,
        location,
        severity,
        status,
        created_at,
        assigned_driver_id,
        drivers (
          id,
          first_name,
          last_name,
          phone_number
        )
      `)
      .not('status', 'in', '(completed,cancelled)')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get critical cases
    const { count: criticalCases } = await supabase
      .from('sos_requests')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .not('status', 'in', '(completed,cancelled)')

    // Get high priority cases
    const { count: highPriorityCases } = await supabase
      .from('sos_requests')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'high')
      .not('status', 'in', '(completed,cancelled)')

    const stats = {
      activeEmergencies: activeEmergencies || 0,
      availableAmbulances: availableAmbulances || 0,
      onDutyDrivers: onDutyDrivers || 0,
      avgResponseTime,
      completedToday: completedToday || 0,
      pendingAssignments: pendingAssignments || 0,
      criticalCases: criticalCases || 0,
      highPriorityCases: highPriorityCases || 0,
      activeCases: activeCases || [],
      totalDrivers: totalDrivers || 0
    }

    return NextResponse.json({
      stats,
      success: true
    })
  } catch (error) {
    console.error('Error fetching ERT dashboard stats:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch ERT dashboard stats',
        success: false 
      },
      { status: 500 }
    )
  }
}
