import { NextRequest, NextResponse } from 'next/server'
import { auditHospitalAccess, requireHospital } from '@/lib/auth/requireHospital'
import { buildJourney, currentStage, effectiveOutcome } from '@/lib/hospital/journey'
import { loadSosRows } from '@/lib/hospital/sosRows'

/**
 * GET /api/hospital/alerts/[alertId]/journey — the complete timeline of one SOS
 * as this hospital saw it: trigger, ambulance stages, confirmation, admission or
 * stand-down, with elapsed times and the total journey duration.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx
  const { alertId } = await params

  // Scoped to hospital_id: another hospital's alert id resolves to nothing.
  const { data: alert, error } = await supabase
    .from('hospital_sos_alerts')
    .select(
      'id, sos_request_id, patient_id, registration_type, status, outcome, triggered_at, confirmed_at, cancelled_at, updated_at, destination_label, destination_kind, eta_minutes, eta_at_confirmation_minutes, patient_name, blood_group, known_conditions, allergies',
    )
    .eq('id', alertId)
    .eq('hospital_id', hospitalId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

  await auditHospitalAccess(ctx, 'VIEW_SOS_JOURNEY', {
    patientId: alert.patient_id as string | null,
    sosRequestId: alert.sos_request_id as string,
  })

  const sos = (await loadSosRows(ctx, [alert.sos_request_id as string])).get(alert.sos_request_id as string) ?? null
  const typed = alert as Parameters<typeof buildJourney>[0]
  const journey = buildJourney(typed, sos)

  return NextResponse.json({
    alert: { ...alert, effective_outcome: effectiveOutcome(typed) },
    stage: currentStage(typed, sos),
    ...journey,
  })
}
