import { NextRequest, NextResponse } from 'next/server'
import { getTransportCompany, driverBelongsToCompany } from '@/lib/auth/getTransportCompany'

export interface SosLogRow {
  id: string
  timestamp: string | null
  action: 'Accepted' | 'Cancelled' | 'Rejected' | 'Pending' | 'Other'
  reason: string | null
  reassigned: boolean
  sosRequestId: string
}

interface AssignedRow {
  id: string
  sos_request_id: string
  assigned_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string | null
  status: string | null
  rejection_reason: string | null
  rejection_type: string | null
  previous_assignment_id: string | null
}

function deriveAction(r: AssignedRow): SosLogRow['action'] {
  if (r.status === 'accepted') return 'Accepted'
  if (r.status === 'cancelled' || r.rejection_type === 'declined') return 'Cancelled'
  if (r.status === 'rejected' || r.rejection_type === 'timed_out') return 'Rejected'
  if (r.status === 'pending') return 'Pending'
  return 'Other'
}

// GET /api/transport/drivers/[id]/sos-log?action=&from=&to=  (transport_company)
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
    const action = sp.get('action') // 'Cancelled' | 'Rejected' | null(all)
    const from = sp.get('from')
    const to = sp.get('to')

    let query = supabase
      .from('sos_request_assigned')
      .select(
        'id, sos_request_id, assigned_at, accepted_at, rejected_at, created_at, status, rejection_reason, rejection_type, previous_assignment_id',
      )
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (action === 'Cancelled') query = query.or('status.eq.cancelled,rejection_type.eq.declined')
    else if (action === 'Rejected') query = query.or('status.eq.rejected,rejection_type.eq.timed_out')

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to load SOS log', details: error.message }, { status: 500 })
    }

    const rows: SosLogRow[] = ((data ?? []) as AssignedRow[]).map((r) => ({
      id: r.id,
      timestamp: r.rejected_at || r.accepted_at || r.assigned_at || r.created_at,
      action: deriveAction(r),
      reason: r.rejection_reason,
      reassigned: !!r.previous_assignment_id,
      sosRequestId: r.sos_request_id,
    }))

    return NextResponse.json({ success: true, log: rows })
  } catch (err) {
    console.error('[transport:sos-log] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to load SOS log' }, { status: 500 })
  }
}
