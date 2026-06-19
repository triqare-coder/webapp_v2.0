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

    let query = supabase
      .from('sos_requests')
      .select('id, requested_at, completed_at, status, patient_id, destination_hospital_id')
      .eq('assigned_driver_id', driverId)
      .order('requested_at', { ascending: false })

    if (from) query = query.gte('requested_at', from)
    if (to) query = query.lte('requested_at', to)
    if (outcome === 'Completed') query = query.in('status', COMPLETED_STATUSES)
    else if (outcome === 'Cancelled') query = query.in('status', CANCELLED_STATUSES)

    const { data: trips, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to load trips', details: error.message }, { status: 500 })
    }

    // Resolve patient names + hospital names in batch (avoids FK-name-fragile joins).
    const patientIds = [...new Set((trips ?? []).map((t) => t.patient_id).filter(Boolean))] as string[]
    const hospitalIds = [...new Set((trips ?? []).map((t) => t.destination_hospital_id).filter(Boolean))] as string[]

    const patientNames: Record<string, string> = {}
    if (patientIds.length) {
      const { data: users } = await supabase.from('users').select('id, full_name').in('id', patientIds)
      for (const u of users ?? []) patientNames[u.id] = u.full_name ?? '—'
    }
    const hospitalNames: Record<string, string> = {}
    if (hospitalIds.length) {
      const { data: hospitals } = await supabase.from('hospitals').select('id, name').in('id', hospitalIds)
      for (const h of hospitals ?? []) hospitalNames[h.id] = h.name ?? '—'
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
        destinationHospital: t.destination_hospital_id ? hospitalNames[t.destination_hospital_id] ?? '—' : '—',
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
