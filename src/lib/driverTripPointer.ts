import { isTerminalStatus } from '@/lib/sosStatus'

/**
 * "Is the SOS this driver is pinned to actually still live?"
 *
 * `drivers.current_request_id` is a pointer that leaks. The web portal clears it
 * on any terminal status (releaseDriver in src/services/sosRequestService.ts),
 * but the mobile app's cancel writes only `sos_requests.status = 'Cancelled'` —
 * services/sos-service.ts never touches the drivers table — so a patient
 * cancelling an already-assigned SOS leaves the driver pinned indefinitely. On
 * live that showed one driver "On Trip" for four days against a fleet with zero
 * active emergencies.
 *
 * A live assignment outranks every other duty signal, and rightly so: hiding a
 * driver who is mid-emergency would be far worse than showing a stale trip. That
 * ranking is exactly why the pointer has to be verified rather than believed.
 *
 * Returns a map of driver user_id -> is the linked request live. A driver absent
 * from the map has no pointer at all. An id that resolves to no row counts as
 * NOT live: a pointer at a deleted request is stale by definition.
 */

interface RequestStatusClient {
  from(table: string): unknown
}

interface RequestQuery {
  select(cols: string): {
    in(col: string, vals: readonly string[]): PromiseLike<{
      data: unknown
      error: { message: string } | null
    }>
  }
}

export interface TripPointerRow {
  user_id: string
  current_request_id?: string | null
}

export async function resolveTripPointers(
  client: RequestStatusClient,
  drivers: TripPointerRow[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()

  const pinned = drivers.filter(
    (d): d is TripPointerRow & { current_request_id: string } => Boolean(d.current_request_id),
  )
  if (pinned.length === 0) return result

  const requestIds = Array.from(new Set(pinned.map((d) => d.current_request_id)))

  const { data, error } = await (client.from('sos_requests') as RequestQuery)
    .select('id, status')
    .in('id', requestIds)

  if (error) {
    // Could not check. Leave the map empty so every pointer stays TRUSTED —
    // the derivation then behaves exactly as it did before this guard existed,
    // which is the safe direction: a stale trip on screen, never a hidden one.
    console.warn('[presence] could not resolve trip pointers:', error.message)
    return result
  }

  const liveById = new Map(
    ((data as { id: string; status: string }[] | null) ?? []).map((r) => [
      r.id,
      !isTerminalStatus(r.status),
    ]),
  )

  for (const d of pinned) {
    // Missing id => the request is gone => the pointer is stale.
    result.set(d.user_id, liveById.get(d.current_request_id) ?? false)
  }
  return result
}
