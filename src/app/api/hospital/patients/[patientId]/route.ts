import { NextRequest, NextResponse } from 'next/server'
import { auditHospitalAccess, requireHospital } from '@/lib/auth/requireHospital'

/**
 * GET /api/hospital/patients/[patientId] — the full patient profile (US-003).
 *
 * The registration row is fetched FIRST and scoped to the caller's hospital: it
 * is both the authorisation check (this patient is registered with me) and the
 * fallback source of truth. Only then is the live profile read. A patient who
 * deleted their account has no users/patients row left, so the panel falls back
 * to the snapshot rather than 404ing (US-003 AC3).
 *
 * Every call writes to hospital_audit_log — this is the DPDPA-relevant read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx
  const { patientId } = await params

  // Authorisation: scoped to hospital_id, so another hospital's patient is a
  // 404 here regardless of what id is supplied.
  const { data: registrations, error: regError } = await supabase
    .from('hospital_patient_registrations')
    .select('id, patient_id, registration_type, registered_since, status, patient_name, patient_phone, blood_group, known_conditions')
    .eq('hospital_id', hospitalId)
    .eq('patient_id', patientId)
    .is('archived_at', null)

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 })
  if (!registrations?.length) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  await auditHospitalAccess(ctx, 'VIEW_PATIENT_PROFILE', { patientId })

  const [{ data: user }, { data: patient }, { data: contacts }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, first_name, last_name, email, phone, avatar_url, date_of_birth, gender, address, city, state, zip_code')
      .eq('id', patientId)
      .maybeSingle(),
    supabase
      .from('patients')
      .select(
        'user_id, dob, gender, blood_group, allergies, medication_allergies, environmental_allergies, known_conditions, current_medications, mobility_flags, organ_donor, medical_notes, address_line, insurance_provider, insurance_policy_number, insurance_policy_type, insurance_valid_from, insurance_valid_till, insurance_coverage_summary, insurer_emergency_phone',
      )
      .eq('user_id', patientId)
      .maybeSingle(),
    supabase
      .from('emergency_contacts')
      .select('id, name, relationship, phone, is_primary')
      .eq('patient_id', patientId)
      .order('is_primary', { ascending: false }),
  ])

  return NextResponse.json({
    // `deleted` tells the UI to present the record as a read-only historical
    // snapshot rather than a live profile that simply happens to be sparse.
    deleted: !user,
    registrations,
    user: user ?? null,
    patient: patient ?? null,
    emergencyContacts: contacts ?? [],
  })
}
