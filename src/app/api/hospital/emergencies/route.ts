import { NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'
import { currentStage } from '@/lib/hospital/journey'
import { loadSosRows } from '@/lib/hospital/sosRows'

/**
 * GET /api/hospital/emergencies — the Patients tab: every SOS this hospital is
 * currently preparing for (PENDING or CONFIRMED_INCOMING, not yet closed).
 *
 * Admitted and stood-down alerts are excluded; they live in Admission History.
 * Each row carries the SOS's live stage from the driver's status_history, so the
 * hospital follows the same workflow steps the patient and driver apps show.
 */
export async function GET() {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx

  const { data, error } = await supabase
    .from('hospital_sos_alerts')
    .select(
      'id, sos_request_id, patient_id, registration_type, status, outcome, triggered_at, confirmed_at, cancelled_at, updated_at, destination_label, destination_kind, eta_minutes, eta_updated_at, patient_name, blood_group, known_conditions, allergies',
    )
    .eq('hospital_id', hospitalId)
    .eq('outcome', 'PENDING')
    .in('status', ['PENDING', 'CONFIRMED_INCOMING'])
    .order('triggered_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sos = await loadSosRows(ctx, (data ?? []).map((a) => a.sos_request_id as string))
  const emergencies = (data ?? []).map((a) => ({
    ...a,
    stage: currentStage(a as Parameters<typeof currentStage>[0], sos.get(a.sos_request_id as string) ?? null),
  }))

  return NextResponse.json({ emergencies })
}
