import { NextRequest, NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/requirePatient'
import { createServerClient } from '@/lib/supabase/server'
import { createOrder, getRazorpayConfig, rupeesToPaise } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

// POST /api/pro/checkout { plan_id } — create a Razorpay order for a Pro plan.
// The amount is read from subscription_plans here, never taken from the client,
// and who/what is being bought is pinned into the order's notes so the verify
// route and the webhook can settle it without trusting the browser.
export async function POST(request: NextRequest) {
  const gate = await requirePatient(request)
  if (gate.error) return gate.error

  const cfg = getRazorpayConfig()
  if (!cfg) {
    return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const planId = typeof body?.plan_id === 'string' ? body.plan_id : ''
  if (!planId) return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })

  const db = createServerClient()
  const { data: plan } = await db
    .from('subscription_plans')
    .select('id, name, price, is_active')
    .eq('id', planId)
    .maybeSingle()
  if (!plan || !plan.is_active || Number(plan.price) <= 0) {
    return NextResponse.json({ error: 'This plan is not available' }, { status: 404 })
  }

  // patient_subscriptions.patient_id → patients.user_id; without the row the
  // purchase could be charged and then fail to record.
  const patientId = gate.appUser.id
  const { data: patient } = await db.from('patients').select('user_id').eq('user_id', patientId).maybeSingle()
  if (!patient) {
    return NextResponse.json({ error: 'Finish setting up your patient profile before upgrading' }, { status: 409 })
  }

  try {
    const order = await createOrder(cfg, {
      amountPaise: rupeesToPaise(plan.price),
      // Razorpay caps receipt at 40 chars.
      receipt: `pro_${Date.now()}_${patientId.slice(0, 8)}`,
      notes: { purpose: 'qsos_pro', patient_id: patientId, plan_id: plan.id, plan_name: plan.name },
    })
    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: cfg.keyId,
      mode: cfg.mode,
      plan_name: plan.name,
      prefill: {
        name: gate.appUser.full_name ?? '',
        email: gate.appUser.email ?? '',
        contact: gate.appUser.phone ?? '',
      },
    })
  } catch (e) {
    console.error('[pro/checkout]', (e as Error).message)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 })
  }
}
