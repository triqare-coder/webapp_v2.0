import { NextResponse } from 'next/server'
import { getTransportCompany } from '@/lib/auth/getTransportCompany'
import {
  COMPLETED_STATUSES,
  AMBER_WINDOW_DAYS,
  deriveDriverStatus,
  isHighRiskDriver,
  type DriverDashboardStats,
} from '@/lib/transport/driverDashboard'

// GET /api/transport/drivers/stats  (transport_company)
// Per-driver dashboard metrics: current status, total trips, SOS cancellations
// and rejections (rolling 30 days), and the amber high-risk flag.
export async function GET() {
  const ctx = await getTransportCompany()
  if (ctx.error) return ctx.error
  const { supabase, companyUserId } = ctx

  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('user_id, status, is_available, current_request_id')
      .eq('transport_company_id', companyUserId)
    if (error) {
      return NextResponse.json({ error: 'Failed to load drivers', details: error.message }, { status: 500 })
    }

    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - AMBER_WINDOW_DAYS)
    const windowIso = windowStart.toISOString()

    const stats: DriverDashboardStats[] = await Promise.all(
      (drivers ?? []).map(async (d): Promise<DriverDashboardStats> => {
        const driverId = d.user_id as string

        // Total (completed) trips — match both status vocabularies.
        const { count: totalTrips } = await supabase
          .from('sos_requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_driver_id', driverId)
          .in('status', COMPLETED_STATUSES)

        // SOS cancellations (driver actively declined) — last 30 days.
        const { count: sosCancellations } = await supabase
          .from('sos_request_assigned')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', driverId)
          .gte('created_at', windowIso)
          .or('status.eq.cancelled,rejection_type.eq.declined')

        // SOS rejections (offer timed out) — last 30 days.
        const { count: sosRejections } = await supabase
          .from('sos_request_assigned')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', driverId)
          .gte('created_at', windowIso)
          .or('status.eq.rejected,rejection_type.eq.timed_out')

        const cancellations = sosCancellations ?? 0
        const rejections = sosRejections ?? 0

        return {
          driverId,
          currentStatus: deriveDriverStatus(d),
          totalTrips: totalTrips ?? 0,
          sosCancellations: cancellations,
          sosRejections: rejections,
          amber: isHighRiskDriver(cancellations, rejections),
        }
      }),
    )

    const byId: Record<string, DriverDashboardStats> = {}
    for (const s of stats) byId[s.driverId] = s

    return NextResponse.json({ success: true, stats, byId })
  } catch (err) {
    console.error('[transport:driver-stats] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to compute driver stats' }, { status: 500 })
  }
}
