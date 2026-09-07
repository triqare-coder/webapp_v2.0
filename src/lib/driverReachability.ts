/**
 * "Can dispatch actually reach this driver?" — the one place that asks.
 *
 * `device_tokens` is deliberately not readable by anon/authenticated (see
 * migrations/99_updates/push_device_tokens_lock_read.sql), so a direct
 * `.from('device_tokens')` works only for the service-role client and fails with
 * 42501 everywhere else. Three call sites used to inline that select; the one
 * running on the anon client (the admin driver list) had been silently failing,
 * which is what made six unreachable drivers render a green "On duty".
 *
 * Everything now goes through the SECURITY DEFINER RPC, which works for both
 * clients and returns ids only, never token strings.
 * See migrations/99_updates/driver_push_reachability.sql.
 */

/** The slice of a Supabase client this needs — structural, so both the anon and
 *  the service-role client satisfy it without importing either. */
interface RpcCapableClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

/**
 * Which of `userIds` have an active device registered for push.
 *
 * Returns `null` when the lookup itself failed — NOT an empty set. The two mean
 * opposite things to the presence derivation: an empty set says "checked, nobody
 * is reachable", while null says "we do not know", and reporting a lookup outage
 * as a fleet-wide outage would be its own false alarm.
 */
export async function fetchPushReachability(
  client: RpcCapableClient,
  userIds: (string | null | undefined)[],
): Promise<Set<string> | null> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return new Set<string>()

  const { data, error } = await client.rpc('driver_push_reachability', { user_ids: ids })

  if (error) {
    // Loud enough to find in the function logs, but never fatal: presence still
    // renders, it just renders as unknown rather than as a confident green.
    console.warn('[presence] driver_push_reachability failed:', error.message)
    return null
  }

  const rows = (data as { user_id: string }[] | null) ?? []
  return new Set(rows.map((r) => r.user_id))
}
