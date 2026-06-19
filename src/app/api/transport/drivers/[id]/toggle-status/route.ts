import { NextRequest, NextResponse } from 'next/server'
import { getTransportCompany, driverBelongsToCompany } from '@/lib/auth/getTransportCompany'

// POST /api/transport/drivers/[id]/toggle-status  (transport_company)
// body: { action: 'activate' | 'deactivate' }
//   deactivate -> status 'inactive' + is_available false  (shows as "Unavailable")
//   activate   -> status 'available' + is_available true  (shows as "Online")
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTransportCompany()
  if (ctx.error) return ctx.error
  const { supabase, companyUserId } = ctx

  try {
    const { id: driverId } = await params
    if (!(await driverBelongsToCompany(supabase, driverId, companyUserId))) {
      return NextResponse.json({ error: 'Driver not found for this company' }, { status: 404 })
    }

    const { action } = (await request.json()) as { action?: string }
    if (action !== 'activate' && action !== 'deactivate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const update =
      action === 'deactivate'
        ? { status: 'inactive', is_available: false }
        : { status: 'available', is_available: true }

    const { error } = await supabase.from('drivers').update(update).eq('user_id', driverId)
    if (error) {
      return NextResponse.json({ error: 'Failed to update driver', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: update.status })
  } catch (err) {
    console.error('[transport:toggle-status] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to toggle status' }, { status: 500 })
  }
}
