import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rupeesToPaise, verifyCheckoutSignature, verifyWebhookSignature } from '@/lib/payments/razorpay'
import { computePeriod, todayIST } from '@/lib/payments/proSubscription'

const sign = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('hex')

describe('Razorpay signatures', () => {
  it('accepts the checkout signature Razorpay produces and rejects tampering', () => {
    const sig = sign('sec', 'order_1|pay_1')
    expect(verifyCheckoutSignature('sec', 'order_1', 'pay_1', sig)).toBe(true)
    expect(verifyCheckoutSignature('sec', 'order_1', 'pay_2', sig)).toBe(false)
    expect(verifyCheckoutSignature('other', 'order_1', 'pay_1', sig)).toBe(false)
    expect(verifyCheckoutSignature('sec', 'order_1', 'pay_1', '')).toBe(false)
  })

  it('checks the webhook HMAC over the raw body', () => {
    const body = '{"event":"payment.captured"}'
    expect(verifyWebhookSignature('wh', body, sign('wh', body))).toBe(true)
    expect(verifyWebhookSignature('wh', body + ' ', sign('wh', body))).toBe(false)
  })
})

describe('rupeesToPaise', () => {
  it('avoids float drift', () => {
    expect(rupeesToPaise(499)).toBe(49900)
    expect(rupeesToPaise('4999.00')).toBe(499900)
    expect(rupeesToPaise(499.99)).toBe(49999)
  })
})

describe('computePeriod', () => {
  it('starts today when there is no active plan, inclusive end', () => {
    expect(computePeriod('2026-10-01', 30, null)).toEqual({ start: '2026-10-01', end: '2026-10-30' })
    expect(computePeriod('2026-10-01', 365, null)).toEqual({ start: '2026-10-01', end: '2027-09-30' })
  })
  it('stacks after an active plan instead of overlapping it', () => {
    expect(computePeriod('2026-10-01', 30, '2026-10-10')).toEqual({ start: '2026-10-11', end: '2026-11-09' })
  })
  it('ignores a plan that already ended', () => {
    expect(computePeriod('2026-10-01', 30, '2026-09-30')).toEqual({ start: '2026-10-01', end: '2026-10-30' })
  })
  it('uses the IST calendar day', () => {
    // 20:00 UTC on 30 Sep is 01:30 on 1 Oct in India.
    expect(todayIST(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10-01')
  })
})

// ---- settleProPayment: the guards that stop a browser forging a purchase ----

const rz = vi.hoisted(() => ({
  fetchOrder: vi.fn(),
  fetchPayment: vi.fn(),
  capturePayment: vi.fn(),
}))
const activate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/payments/razorpay', async (orig) => ({ ...(await orig<object>()), ...rz }))
vi.mock('@/lib/payments/proSubscription', async (orig) => ({
  ...(await orig<object>()),
  activateProFromPayment: activate,
}))

const { settleProPayment, SettleError } = await import('@/lib/payments/settleProPayment')
const cfg = { keyId: 'rzp_test_x', keySecret: 's', mode: 'test' as const }
const db = {} as never
const order = {
  id: 'order_1',
  amount: 49900,
  notes: { purpose: 'qsos_pro', patient_id: 'pat-1', plan_id: 'plan-1' },
}
const payment = { id: 'pay_1', order_id: 'order_1', amount: 49900, currency: 'INR', status: 'captured', method: 'upi' }

describe('settleProPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rz.fetchOrder.mockResolvedValue(order)
    rz.fetchPayment.mockResolvedValue(payment)
    activate.mockResolvedValue({ subscriptionId: 'sub-1', start: 'a', end: 'b', alreadyActivated: false })
  })

  it('activates using the patient and plan pinned in the order notes', async () => {
    const r = await settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1', expectPatientId: 'pat-1' })
    expect(r.subscriptionId).toBe('sub-1')
    expect(activate).toHaveBeenCalledWith(db, expect.objectContaining({ patientId: 'pat-1', planId: 'plan-1' }))
  })

  it("refuses to settle another patient's order", async () => {
    await expect(
      settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1', expectPatientId: 'pat-2' }),
    ).rejects.toMatchObject({ status: 403 })
    expect(activate).not.toHaveBeenCalled()
  })

  it('refuses a payment from a different order or for a different amount', async () => {
    rz.fetchPayment.mockResolvedValueOnce({ ...payment, order_id: 'order_9' })
    await expect(settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1' })).rejects.toBeInstanceOf(
      SettleError,
    )
    rz.fetchPayment.mockResolvedValueOnce({ ...payment, amount: 100 })
    await expect(settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1' })).rejects.toBeInstanceOf(
      SettleError,
    )
    expect(activate).not.toHaveBeenCalled()
  })

  it('ignores non-Pro orders on the same Razorpay account', async () => {
    rz.fetchOrder.mockResolvedValueOnce({ ...order, notes: {} })
    await expect(settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1' })).rejects.toMatchObject({
      status: 400,
    })
  })

  it('captures an authorized payment, and refuses a failed one', async () => {
    rz.fetchPayment.mockResolvedValueOnce({ ...payment, status: 'authorized' })
    rz.capturePayment.mockResolvedValueOnce(payment)
    await settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1' })
    expect(rz.capturePayment).toHaveBeenCalledWith(cfg, 'pay_1', 49900)

    rz.fetchPayment.mockResolvedValueOnce({ ...payment, status: 'failed' })
    await expect(settleProPayment(db, cfg, { orderId: 'order_1', paymentId: 'pay_1' })).rejects.toMatchObject({
      status: 402,
    })
  })
})
