/**
 * "Can dispatch actually reach this driver?" — the one place that asks.
 *
 * `device_tokens` is deliberately not readable by anon/authenticated (see
 * migrations/99_updates/push_device_tokens_lock_read.sql), so a direct
 * `.from('device_tokens')` works only for the SERVICE-ROLE client and fails with
 * 42501 everywhere else. Three call sites used to inline that select; the one
 * running on the anon client (the admin driver list) had been silently failing,
 * which is what made unreachable drivers render a green "On duty".
 *
 * The first fix for that was a SECURITY DEFINER RPC callable by both clients —
 * `driver_push_reachability`, migrations/99_updates/driver_push_reachability.sql.
 * It was written on 3 Sep and never applied to production, so every dashboard
 * asked for reachability, got PGRST202, and reported the whole on-duty fleet as
 * unverifiable: "On Duty Now = 1" against a truth of 12. A migration nobody has
 * run is not a fix, and a portal that cannot count its fleet until someone
 * pastes DDL into a SQL editor has a single point of failure with no owner.
 *
 * So reachability no longer depends on that migration existing:
 *
 *   - SERVER callers (the dashboard routes, which hold the service-role client)
 *     try the RPC and fall back to reading device_tokens directly. The fallback
 *     needs no DDL and cannot be un-deployed.
 *   - BROWSER callers go through /api/drivers/reachability, which does the same
 *     thing server-side. That is also the better boundary: it keeps the answer
 *     behind a staff session instead of exposing "which drivers have the app
 *     installed" to anyone holding the public anon key, which is what granting
 *     the RPC to `anon` did.
 *
 * Applying the migration is still worth doing — it makes the RPC path win and
 * saves the fallback query — but nothing is broken while it waits.
 */

type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

/** The slice of a Supabase client this needs — structural, so both the anon and
 *  the service-role client satisfy it without importing either. `from` is typed
 *  as `unknown` on purpose: describing the builder chain here makes TypeScript
 *  try to unify it with PostgrestQueryBuilder's generics, which blows the
 *  instantiation depth limit at every call site (TS2589). The chain is asserted
 *  where it is used instead. */
interface ReachabilityClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<QueryResult>
  from(table: string): unknown
}

/** The one query shape the fallback needs off `from()`. */
interface TokenQuery {
  select(cols: string): {
    eq(col: string, val: unknown): {
      in(col: string, vals: readonly string[]): PromiseLike<QueryResult>
    }
  }
}

/** Is this error "the function is not there", rather than a real failure? */
function isMissingFunction(error: { message: string; code?: string }): boolean {
  return error.code === 'PGRST202' || /could not find the function|does not exist/i.test(error.message)
}

/** Is this error "you may not read that", i.e. we are on a client-side key? */
function isForbidden(error: { message: string; code?: string }): boolean {
  return error.code === '42501' || /permission denied/i.test(error.message)
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
  client: ReachabilityClient,
  userIds: (string | null | undefined)[],
): Promise<Set<string> | null> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return new Set<string>()

  const { data, error } = await client.rpc('driver_push_reachability', { user_ids: ids })

  if (!error) {
    const rows = (data as { user_id: string }[] | null) ?? []
    return new Set(rows.map((r) => r.user_id))
  }

  // The RPC is absent (never applied) or this client may not call it. Read the
  // table instead — which succeeds for the service-role client and is refused,
  // as designed, for anon.
  if (isMissingFunction(error) || isForbidden(error)) {
    const { data: rows, error: tableError } = await (client.from('device_tokens') as TokenQuery)
      .select('user_id')
      .eq('is_active', true)
      .in('user_id', ids)

    if (!tableError) {
      return new Set(((rows as { user_id: string }[] | null) ?? []).map((r) => r.user_id))
    }

    // Both paths refused: this is a browser client, which should be calling
    // fetchPushReachabilityViaApi instead. Loud, because it is a wiring bug.
    console.warn(
      '[presence] reachability unavailable to this client (rpc: %s; table: %s)',
      error.message,
      tableError.message,
    )
    return null
  }

  console.warn('[presence] driver_push_reachability failed:', error.message)
  return null
}

/**
 * Browser-side reachability: same answer, asked of our own server so the token
 * table stays server-only. Returns null on any failure, which the presence
 * derivation renders as "Needs Attention · could not check" rather than as a
 * confident green.
 */
export async function fetchPushReachabilityViaApi(
  userIds: (string | null | undefined)[],
  fetchImpl: typeof fetch = fetch,
): Promise<Set<string> | null> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return new Set<string>()

  try {
    const res = await fetchImpl('/api/drivers/reachability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: ids }),
    })
    if (!res.ok) {
      console.warn('[presence] /api/drivers/reachability returned', res.status)
      return null
    }
    const body = (await res.json()) as { reachable?: string[] }
    if (!Array.isArray(body.reachable)) return null
    return new Set(body.reachable)
  } catch (e) {
    console.warn('[presence] /api/drivers/reachability failed:', e)
    return null
  }
}
