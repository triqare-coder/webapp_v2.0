import type { SupabaseClient } from '@supabase/supabase-js'
import { capturePayment, fetchOrder, fetchPayment, type RazorpayConfig } from './razorpay'
import { activateProFromPayment, type ActivationResult } from './proSubscription'

export class SettleError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

/**
 * Turn a Razorpay (order, payment) pair into a Pro entitlement.
 *
 * Nothing the browser sent is trusted beyond the two ids: who is paying and for
 * which plan come from the order's server-set `notes`, the amount comes from
 * Razorpay's own payment record, and the payment must belong to that order.
 * `expectPatientId` (checkout path) additionally stops one patient settling an
 * order created for another.
 */
export async function settleProPayment(
  db: SupabaseClient,
  cfg: RazorpayConfig,
  args: { orderId: string; paymentId: string; expectPatientId?: string },
): Promise<ActivationResult & { planId: string }> {
  const order = await fetchOrder(cfg, args.orderId)
  const patientId = order.notes?.patient_id
  const planId = order.notes?.plan_id
  if (order.notes?.purpose !== 'qsos_pro' || !patientId || !planId) {
    throw new SettleError('Order is not a QSoS Pro order', 400)
  }
  if (args.expectPatientId && args.expectPatientId !== patientId) {
    throw new SettleError('Order belongs to a different account', 403)
  }

  let payment = await fetchPayment(cfg, args.paymentId)
  if (payment.order_id !== order.id) throw new SettleError('Payment does not belong to this order', 400)
  if (payment.amount !== order.amount) throw new SettleError('Paid amount does not match the order', 400)
  if (payment.status === 'authorized') payment = await capturePayment(cfg, payment.id, order.amount)
  if (payment.status !== 'captured') {
    throw new SettleError(`Payment is ${payment.status}, not captured`, 402)
  }

  const result = await activateProFromPayment(db, { patientId, planId, orderId: order.id, payment, mode: cfg.mode })
  return { ...result, planId }
}
