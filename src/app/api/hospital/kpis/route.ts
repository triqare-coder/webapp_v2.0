import { NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'

/**
 * GET /api/hospital/kpis — the three tiles on the dashboard home (US-002).
 *
 * All three count only what belongs to the caller's own hospital, and the two
 * registration tiles count ACTIVE, non-archived rows only: a patient who
 * deleted their account (INACTIVE) or moved their preference elsewhere
 * (archived) must not still be counted as someone this hospital covers.
 */
export async function GET() {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx

  const registrationCount = (type: 'PRIMARY' | 'SECONDARY') =>
    supabase
      .from('hospital_patient_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('registration_type', type)
      .eq('status', 'ACTIVE')
      .is('archived_at', null)

  const [livesSaved, primary, secondary] = await Promise.all([
    supabase
      .from('hospital_sos_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('outcome', 'ADMITTED'),
    registrationCount('PRIMARY'),
    registrationCount('SECONDARY'),
  ])

  const firstError = livesSaved.error || primary.error || secondary.error
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  return NextResponse.json({
    livesSaved: livesSaved.count ?? 0,
    primaryPatients: primary.count ?? 0,
    secondaryPatients: secondary.count ?? 0,
  })
}
