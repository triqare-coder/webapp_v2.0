import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getRazorpayConfig, verifyWebhookSignature } from '@/lib/payments/razorpay'
import { SettleError, settleProPayment } from '@/lib/payments/settleProPayment'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/razorpay — server-to-server safety net for the checkout
// callback (tab closed, network drop, UPI approved on another device after the
// modal gave up). Public by the /api/webhooks middleware prefix; authenticated
// by the X-Razorpay-Signature HMAC over the RAW body.
//
// Subscribe in Razorpay Dashboard → Webhooks to: payment.captured, order.paid.
export async function POST(request: NextRequest) {
  const cfg = getRazorpayConfig()
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
  if (!cfg || !secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const raw = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  if (!verifyWebhookSignature(secret, raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  type RazorpayEvent = {
    event?: string
    payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } } }
  }
  let event: RazorpayEvent
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  if (event?.event !== 'payment.captured' && event?.event !== 'order.paid') {
    return NextResponse.json({ ok: true, ignored: event?.event ?? null })
  }

  const payment = event?.payload?.payment?.entity
  const orderId: string | undefined = payment?.order_id ?? event?.payload?.order?.entity?.id
  if (!payment?.id || !orderId) return NextResponse.json({ ok: true, ignored: 'no order' })

  try {
    const result = await settleProPayment(createServerClient(), cfg, { orderId, paymentId: payment.id })
    return NextResponse.json({ ok: true, subscription_id: result.subscriptionId, duplicate: result.alreadyActivated })
  } catch (e) {
    // A non-Pro order (someone else's product on the same Razorpay account) or a
    // non-captured payment is not a failure worth Razorpay retrying.
    if (e instanceof SettleError) return NextResponse.json({ ok: true, ignored: e.message })
    console.error('[webhooks/razorpay]', payment.id, (e as Error).message)
    // 5xx → Razorpay retries with backoff, which is what we want for a DB blip.
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
