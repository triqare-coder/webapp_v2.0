import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, STAFF_ROLES } from '@/lib/auth/requireRole'
import { fetchPushReachability } from '@/lib/driverReachability'

/**
 * POST /api/drivers/reachability  { user_ids: string[] }  ->  { reachable: string[] }
 *
 * Membership test, not a listing: it answers only for the ids the caller sends,
 * and returns ids — never a token string, never a device or platform.
 *
 * This exists because `device_tokens` is server-only by design (see
 * migrations/99_updates/push_device_tokens_lock_read.sql), so the driver lists,
 * which fetch through the browser's anon client, had no way to tell "on duty and
 * reachable" from "on duty and unpageable". The alternative on offer was an RPC
 * granted to `anon`, which would let anyone holding the public key probe which
 * drivers have the app installed. A staff session is the right gate for that.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** One page of a driver list; enough for the whole live fleet several times over. */
const MAX_IDS = 500

export async function POST(request: NextRequest) {
  try {
    // admin / ert / transport_company — the staff who legitimately need to know
    // whether a driver is dispatchable.
    const gate = await requireRole(STAFF_ROLES)
    if (gate.error) return gate.error

    const body = (await request.json().catch(() => null)) as { user_ids?: unknown } | null
    const raw = Array.isArray(body?.user_ids) ? body!.user_ids : []

    // Filter rather than 400: a list row with a malformed id is the caller's
    // problem to render, not a reason to fail reachability for the other 25.
    const ids = raw.filter((id): id is string => typeof id === 'string' && UUID.test(id))
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `At most ${MAX_IDS} ids per request` }, { status: 400 })
    }
    if (ids.length === 0) return NextResponse.json({ reachable: [] })

    // Service-role client: the only one that can read the token table.
    const supabase = await createClient()
    const reachable = await fetchPushReachability(supabase, ids)

    // null = the lookup failed. Say so with a status, so the caller renders
    // "could not check" instead of treating an outage as "nobody is reachable".
    if (reachable === null) {
      return NextResponse.json({ error: 'Reachability lookup failed' }, { status: 503 })
    }

    return NextResponse.json({ reachable: Array.from(reachable) })
  } catch (error) {
    console.error('[api/drivers/reachability]', error)
    return NextResponse.json({ error: 'Reachability lookup failed' }, { status: 500 })
  }
}
