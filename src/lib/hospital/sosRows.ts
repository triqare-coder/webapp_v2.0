import type { HospitalContext } from '@/lib/auth/requireHospital'
import type { JourneySos } from './journey'

/**
 * The SOS rows behind a set of alerts, keyed by sos_request id. SERVER-ONLY.
 *
 * Callers must pass ids taken from alerts already scoped to ctx.hospitalId;
 * this never accepts an id from the request. A missing entry means the patient
 * deleted their account (sos_requests cascades away) and the caller falls back
 * to the alert's own snapshot.
 */
export async function loadSosRows(
  ctx: HospitalContext,
  sosRequestIds: string[],
): Promise<Map<string, JourneySos & { id: string }>> {
  const ids = [...new Set(sosRequestIds.filter(Boolean))]
  const map = new Map<string, JourneySos & { id: string }>()
  if (!ids.length) return map

  const { data, error } = await ctx.supabase
    .from('sos_requests')
    .select('id, status, status_history, completed_at')
    .in('id', ids)
  if (error) {
    // Degrade to snapshot-only rows rather than failing the list: an emergency
    // list that errors is worse than one missing its stage column.
    console.error('[hospital] sos_requests read failed', error.message)
    return map
  }
  for (const row of data ?? []) map.set(row.id as string, row as JourneySos & { id: string })
  return map
}
