import { NextRequest, NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'

/**
 * GET /api/hospital/patients — the Registered Patient List (US-003).
 *
 * ?status=ACTIVE (default) | INACTIVE   ?search=   ?limit=  ?offset=
 *
 * Archived rows are excluded from BOTH views. A patient who changed their
 * preference away is removed entirely rather than shown as inactive (US-004);
 * the Inactive toggle is only for patients who deleted their account (US-005).
 *
 * Everything served here comes off the hospital's own registration rows, which
 * carry a snapshot of name/blood group/conditions. That is what lets a deleted
 * patient's row still render (US-003 AC3) even though the users and patients
 * rows are gone.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const search = searchParams.get('search')?.trim()
  const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200)
  const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10) || 0

  let query = supabase
    .from('hospital_patient_registrations')
    .select(
      'id, patient_id, registration_type, registered_since, status, patient_name, blood_group, known_conditions',
      { count: 'exact' },
    )
    .eq('hospital_id', hospitalId)
    .eq('status', status)
    .is('archived_at', null)
    .order('registered_since', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    // Escape the LIKE wildcards a patient name could legitimately contain,
    // so a search for "%" does not match every row.
    query = query.ilike('patient_name', `%${search.replace(/[%_]/g, '\\$&')}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ patients: data ?? [], count: count ?? 0 })
}
