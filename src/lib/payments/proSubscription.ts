import type { SupabaseClient } from '@supabase/supabase-js'
import type { RazorpayPayment } from './razorpay'

/**
 * QSoS Pro entitlement, stored in the tables the admin Accounting screens
 * already read (live column names — NOT the ones in migrations/01_schema):
 *
 *   patient_subscriptions  one row per paid period; transaction_id = Razorpay payment id
 *   billing_history        one row per payment;    payment_gateway = 'razorpay'
 *
 * Dates are calendar dates in IST, inclusive: a 30-day plan bought on 1 Oct is
 * valid through 30 Oct. Buying again while still active stacks the new period
 * after the current end date instead of wasting the remaining days.
 */

const IST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })

export function todayIST(now: Date = new Date()): string {
  return IST_DATE.format(now) // YYYY-MM-DD
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The period a new purchase covers, given today and the latest active end date (if any). */
export function computePeriod(
  today: string,
  durationDays: number,
  currentEndDate: string | null,
): { start: string; end: string } {
  const start = currentEndDate && currentEndDate >= today ? addDays(currentEndDate, 1) : today
  return { start, end: addDays(start, Math.max(1, durationDays) - 1) }
}

export type ProStatus = {
  active: boolean
  validThrough: string | null
  planName: string | null
}

/** Latest paid, active, not-yet-ended subscription for the patient. */
export async function getProStatus(db: SupabaseClient, patientId: string): Promise<ProStatus> {
  const { data } = await db
    .from('patient_subscriptions')
    .select('end_date, subscription_plans(name)')
    .eq('patient_id', patientId)
    .eq('subscription_status', 'active')
    .eq('payment_status', 'paid')
    .gte('end_date', todayIST())
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return { active: false, validThrough: null, planName: null }
  // to-ONE embed → an object, not an array.
  const plan = data.subscription_plans as unknown as { name: string } | null
  return { active: true, validThrough: data.end_date, planName: plan?.name ?? null }
}

export type ActivationResult = {
  subscriptionId: string
  start: string
  end: string
  alreadyActivated: boolean
}

/**
 * Grant Pro for a captured Razorpay payment. Safe to call more than once for
 * the same payment (the checkout callback and the webhook both call it, often
 * within the same second): the unique index on patient_subscriptions.transaction_id
 * lets exactly one insert win and the other returns the existing row.
 */
export async function activateProFromPayment(
  db: SupabaseClient,
  input: { patientId: string; planId: string; orderId: string; payment: RazorpayPayment; mode: 'test' | 'live' },
): Promise<ActivationResult> {
  const { patientId, planId, orderId, payment, mode } = input

  const existing = await findByPayment(db, payment.id)
  if (existing) {
    await ensureBillingRow(db, { patientId, subscriptionId: existing.id, orderId, payment, mode })
    return { subscriptionId: existing.id, start: existing.start_date, end: existing.end_date, alreadyActivated: true }
  }

  const { data: plan, error: planErr } = await db
    .from('subscription_plans')
    .select('id, name, duration_days')
    .eq('id', planId)
    .single()
  if (planErr || !plan) throw new Error(`Plan ${planId} not found`)

  const status = await getProStatus(db, patientId)
  const { start, end } = computePeriod(todayIST(), plan.duration_days, status.validThrough)

  const { data: inserted, error: insErr } = await db
    .from('patient_subscriptions')
    .insert({
      patient_id: patientId,
      plan_id: planId,
      start_date: start,
      end_date: end,
      payment_status: 'paid',
      subscription_status: 'active',
      transaction_id: payment.id,
    })
    .select('id, start_date, end_date')
    .single()

  if (insErr) {
    // 23505 = the concurrent caller won the race; use its row.
    if (insErr.code === '23505') {
      const winner = await findByPayment(db, payment.id)
      if (winner) {
        await ensureBillingRow(db, { patientId, subscriptionId: winner.id, orderId, payment, mode })
        return { subscriptionId: winner.id, start: winner.start_date, end: winner.end_date, alreadyActivated: true }
      }
    }
    throw new Error(`Could not record subscription: ${insErr.message}`)
  }

  // Belt and braces until razorpay_pro.sql's unique index is applied: if a
  // concurrent call also inserted, the oldest row wins and the loser deletes itself.
  const { data: dupes } = await db
    .from('patient_subscriptions')
    .select('id, start_date, end_date')
    .eq('transaction_id', payment.id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  const winner = dupes?.[0]
  if (winner && winner.id !== inserted.id) {
    await db.from('patient_subscriptions').delete().eq('id', inserted.id)
    await ensureBillingRow(db, { patientId, subscriptionId: winner.id, orderId, payment, mode })
    return { subscriptionId: winner.id, start: winner.start_date, end: winner.end_date, alreadyActivated: true }
  }

  await ensureBillingRow(db, { patientId, subscriptionId: inserted.id, orderId, payment, mode, planName: plan.name })
  return { subscriptionId: inserted.id, start: inserted.start_date, end: inserted.end_date, alreadyActivated: false }
}

async function findByPayment(db: SupabaseClient, paymentId: string) {
  const { data } = await db
    .from('patient_subscriptions')
    .select('id, start_date, end_date')
    .eq('transaction_id', paymentId)
    .maybeSingle()
  return data
}

async function ensureBillingRow(
  db: SupabaseClient,
  args: {
    patientId: string
    subscriptionId: string
    orderId: string
    payment: RazorpayPayment
    mode: 'test' | 'live'
    planName?: string
  },
) {
  const { data: found } = await db
    .from('billing_history')
    .select('id')
    .eq('transaction_id', args.payment.id)
    .maybeSingle()
  if (found) return

  const { error } = await db.from('billing_history').insert({
    patient_id: args.patientId,
    subscription_id: args.subscriptionId,
    amount: args.payment.amount / 100,
    currency: args.payment.currency || 'INR',
    payment_method: args.payment.method,
    payment_gateway: 'razorpay',
    transaction_id: args.payment.id,
    status: 'paid',
    metadata: {
      razorpay_order_id: args.orderId,
      razorpay_mode: args.mode,
      ...(args.planName ? { plan_name: args.planName } : {}),
    },
  })
  // The entitlement is already granted; a missing receipt row must not fail the purchase.
  if (error && error.code !== '23505') {
    console.error('[pro] billing_history insert failed', args.payment.id, error.message)
  }
}
