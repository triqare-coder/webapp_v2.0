import { NextRequest, NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/requirePatient'
import { createServerClient } from '@/lib/supabase/server'
import { getRazorpayConfig, verifyCheckoutSignature } from '@/lib/payments/razorpay'
import { SettleError, settleProPayment } from '@/lib/payments/settleProPayment'

export const dynamic = 'force-dynamic'

// POST /api/pro/verify — Razorpay Checkout's success handler posts the three
// razorpay_* fields here. Signature first (cheap, proves the ids came from a
// real checkout on our key), then settle against Razorpay's own records.
export async function POST(request: NextRequest) {
  const gate = await requirePatient(request)
  if (gate.error) return gate.error

  const cfg = getRazorpayConfig()
  if (!cfg) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.razorpay_order_id ?? '')
  const paymentId = String(body?.razorpay_payment_id ?? '')
  const signature = String(body?.razorpay_signature ?? '')
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
  }
  if (!verifyCheckoutSignature(cfg.keySecret, orderId, paymentId, signature)) {
    return NextResponse.json({ error: 'Payment signature is invalid' }, { status: 400 })
  }

  try {
    const result = await settleProPayment(createServerClient(), cfg, {
      orderId,
      paymentId,
      expectPatientId: gate.appUser.id,
    })
    return NextResponse.json({ ok: true, valid_through: result.end, starts: result.start })
  } catch (e) {
    const status = e instanceof SettleError ? e.status : 500
    console.error('[pro/verify]', paymentId, (e as Error).message)
    return NextResponse.json(
      {
        error:
          status === 500
            ? 'Payment received but activation is delayed. It will apply automatically shortly.'
            : (e as Error).message,
      },
      { status },
    )
  }
}
