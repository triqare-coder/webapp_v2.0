import { NextRequest, NextResponse } from 'next/server'
import { getTransportCompany, driverBelongsToCompany } from '@/lib/auth/getTransportCompany'
import {
  COMPLETED_STATUSES,
  CANCELLED_STATUSES,
  tripOutcome,
} from '@/lib/transport/driverDashboard'

export interface TripHistoryRow {
  id: string
  dateTime: string | null
  patientName: string
  destinationHospital: string
  outcome: string
  durationMinutes: number | null
}

// GET /api/transport/drivers/[id]/trip-history?outcome=&from=&to=  (transport_company)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTransportCompany()
  if (ctx.error) return ctx.error
  const { supabase, companyUserId } = ctx

  try {
    const { id: driverId } = await params
    if (!(await driverBelongsToCompany(supabase, driverId, companyUserId))) {
      return NextResponse.json({ error: 'Driver not found for this company' }, { status: 404 })
    }

    const sp = request.nextUrl.searchParams
    const outcome = sp.get('outcome') // 'Completed' | 'Cancelled' | null(all)
    const from = sp.get('from')
    const to = sp.get('to')

    // The driver is stored inline on sos_requests.driver_id (assigned_driver_id is
    // an unused legacy column, so filtering on it returned no trips at all), and
    // the live table has no destination_hospital_id — selecting it 500s the route.
    let query = supabase
      .from('sos_requests')
      .select('id, requested_at, completed_at, status, patient_id')
      .eq('driver_id', driverId)
      .order('requested_at', { ascending: false })

    if (from) query = query.gte('requested_at', from)
    if (to) query = query.lte('requested_at', to)
    if (outcome === 'Completed') query = query.in('status', COMPLETED_STATUSES)
    else if (outcome === 'Cancelled') query = query.in('status', CANCELLED_STATUSES)

    const { data: trips, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to load trips', details: error.message }, { status: 500 })
    }

    // Resolve patient names in batch (avoids FK-name-fragile joins).
    const patientIds = [...new Set((trips ?? []).map((t) => t.patient_id).filter(Boolean))] as string[]

    const patientNames: Record<string, string> = {}
    if (patientIds.length) {
      const { data: users } = await supabase.from('users').select('id, full_name').in('id', patientIds)
      for (const u of users ?? []) patientNames[u.id] = u.full_name ?? '—'
    }

    const rows: TripHistoryRow[] = (trips ?? []).map((t) => {
      let durationMinutes: number | null = null
      if (t.requested_at && t.completed_at) {
        durationMinutes = Math.max(
          0,
          Math.round((new Date(t.completed_at).getTime() - new Date(t.requested_at).getTime()) / 60000),
        )
      }
      return {
        id: t.id,
        dateTime: t.requested_at,
        patientName: t.patient_id ? patientNames[t.patient_id] ?? '—' : '—',
        // No actual-destination field on sos_requests yet (deferred with the
        // 'Nearest Hospital' outcome), so this column stays a placeholder.
        destinationHospital: '—',
        outcome: tripOutcome(t.status),
        durationMinutes,
      }
    })

    return NextResponse.json({ success: true, trips: rows })
  } catch (err) {
    console.error('[transport:trip-history] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to load trip history' }, { status: 500 })
  }
}
