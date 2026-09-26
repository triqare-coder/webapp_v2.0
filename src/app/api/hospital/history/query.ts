import type { HospitalContext } from '@/lib/auth/requireHospital'
import { closedAt, effectiveOutcome, type JourneyAlert } from '@/lib/hospital/journey'
import { loadSosRows } from '@/lib/hospital/sosRows'

/**
 * The admission-history query, shared by the table and the CSV export so the
 * export is guaranteed to contain exactly the filtered set the admin is looking
 * at (US-009 AC5) rather than a separately-built approximation of it.
 *
 * History holds CLOSED incidents only: admitted, stood down, or cancelled.
 * Anything still pending or confirmed-incoming is on the Patients tab. A
 * stand-down (status CANCELLED) is closed for this hospital even though the
 * stored outcome stays PENDING until the SOS itself ends -- see effectiveOutcome.
 */
export function buildHistoryQuery(ctx: HospitalContext, searchParams: URLSearchParams) {
  let query = ctx.supabase
    .from('hospital_sos_alerts')
    .select(
      'id, sos_request_id, patient_id, triggered_at, confirmed_at, cancelled_at, updated_at, patient_name, blood_group, known_conditions, registration_type, status, outcome, destination_label, destination_kind, eta_at_confirmation_minutes',
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
  if (outcome === 'ADMITTED') query = query.eq('outcome', 'ADMITTED')
  else if (outcome === 'CANCELLED') query = query.or('outcome.eq.CANCELLED,status.eq.CANCELLED')
  else query = query.or('outcome.neq.PENDING,status.eq.CANCELLED')
  if (search) query = query.ilike('patient_name', `%${search.replace(/[%_]/g, '\\$&')}%`)

  return query
}

/**
 * Adds closed_at (the admitted / cancelled moment, US-009 "Date & Time") and the
 * outcome as the hospital reads it. The admission moment is the driver's
 * 'Arrived at Hospital' entry, which lives on sos_requests, not the alert.
 */
export async function withClosure<T extends Record<string, unknown>>(ctx: HospitalContext, rows: T[]) {
  const sos = await loadSosRows(ctx, rows.map((r) => r.sos_request_id as string))
  return rows.map((r) => {
    const alert = r as unknown as JourneyAlert
    return {
      ...r,
      outcome: effectiveOutcome(alert),
      closed_at: closedAt(alert, sos.get(r.sos_request_id as string) ?? null),
    }
  })
}
