import type { HospitalContext } from '@/lib/auth/requireHospital'

/**
 * The admission-history query, shared by the table and the CSV export so the
 * export is guaranteed to contain exactly the filtered set the admin is looking
 * at (US-009 AC5) rather than a separately-built approximation of it.
 */
export function buildHistoryQuery(ctx: HospitalContext, searchParams: URLSearchParams) {
  let query = ctx.supabase
    .from('hospital_sos_alerts')
    .select(
      'id, sos_request_id, triggered_at, patient_name, blood_group, known_conditions, registration_type, status, outcome, destination_label, destination_kind, eta_at_confirmation_minutes',
      { count: 'exact' },
    )
    .eq('hospital_id', ctx.hospitalId)
    .order('triggered_at', { ascending: false })

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const outcome = searchParams.get('outcome')
  const search = searchParams.get('search')?.trim()

  if (from) query = query.gte('triggered_at', new Date(from).toISOString())
  if (to) {
    // The date input yields a day, and the admin means the whole of it.
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    query = query.lte('triggered_at', end.toISOString())
  }
  if (outcome && ['ADMITTED', 'CANCELLED', 'PENDING'].includes(outcome)) {
    query = query.eq('outcome', outcome)
  }
  if (search) query = query.ilike('patient_name', `%${search.replace(/[%_]/g, '\\$&')}%`)

  return query
}
