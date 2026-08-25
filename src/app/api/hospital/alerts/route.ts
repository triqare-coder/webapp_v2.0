import { NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'

/**
 * GET /api/hospital/alerts — live SOS alerts for this hospital (US-006/007/008).
 *
 * Returns anything still in play (PENDING or CONFIRMED_INCOMING) plus alerts
 * cancelled in the last hour, so a hospital that was stood down still sees WHY
 * its beacon disappeared rather than having it silently vanish.
 */
export async function GET() {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx

  const cancelledSince = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('hospital_sos_alerts')
    .select(
      'id, sos_request_id, patient_id, registration_type, status, outcome, triggered_at, confirmed_at, cancelled_at, destination_label, destination_kind, eta_minutes, eta_updated_at, eta_at_confirmation_minutes, patient_name, blood_group, known_conditions, allergies',
    )
    .eq('hospital_id', hospitalId)
    .or(`status.in.(PENDING,CONFIRMED_INCOMING),cancelled_at.gte.${cancelledSince}`)
    .order('triggered_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerts: data ?? [] })
}
