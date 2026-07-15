import { NextRequest, NextResponse } from 'next/server'
import { dispatchSOSPush, type SOSTransition } from '@/lib/push/sosPush'

// Push dispatch webhook.
//
// Called by the `trg_notify_push_on_sos_change` Postgres trigger (via pg_net) on
// every SOS create and status change — no matter which client wrote it. It decides
// what the transition means, who needs to know, and sends the FCM push.
//
// Auth: PUSH_DISPATCH_SECRET, which must equal the `app.push_dispatch_secret` GUC
// set on the database (see migrations/99_updates/push_notifications.sql).
//
// This route ALWAYS answers 200 on a well-formed request, even when nothing was
// sent. pg_net retries nothing and logs failures into a queue nobody reads, so a
// non-200 here would just be a silent hole; the response body carries the outcome.

// firebase-admin needs Node APIs — it cannot run on the edge runtime.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET
  if (!secret) {
    console.error('[push] PUSH_DISPATCH_SECRET is not set — refusing to dispatch')
    return NextResponse.json({ error: 'Push dispatch not configured' }, { status: 503 })
  }

  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const requestId = typeof body.request_id === 'string' ? body.request_id : null
  const newStatus = typeof body.new_status === 'string' ? body.new_status : null

  if (!requestId || !newStatus) {
    return NextResponse.json({ error: 'request_id and new_status are required' }, { status: 400 })
  }

  const transition: SOSTransition = {
    requestId,
    newStatus,
    oldStatus: typeof body.old_status === 'string' ? body.old_status : null,
    oldDriverId: typeof body.old_driver_id === 'string' ? body.old_driver_id : null,
    newDriverId: typeof body.new_driver_id === 'string' ? body.new_driver_id : null,
  }

  try {
    const result = await dispatchSOSPush(transition)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    // dispatchSOSPush already swallows its own errors; this is the last-resort net.
    console.error('[push] dispatch threw', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 200 }
    )
  }
}
