import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Minimal Razorpay client for the QSoS Pro checkout. SERVER-ONLY.
 *
 * Talks to the REST API directly (Basic auth with key id + secret) instead of
 * pulling in the `razorpay` npm SDK — we only need three calls (create order,
 * fetch order, fetch/capture payment) plus the two HMAC checks.
 *
 * Env:
 *   RAZORPAY_KEY_ID          rzp_test_… (showcase) or rzp_live_… (production)
 *   RAZORPAY_KEY_SECRET      pairs with the key id; never sent to the browser
 *   RAZORPAY_WEBHOOK_SECRET  the secret typed into Dashboard → Webhooks (optional,
 *                            but without it the webhook route refuses everything)
 */

const API_BASE = 'https://api.razorpay.com/v1'

export type RazorpayConfig = { keyId: string; keySecret: string; mode: 'test' | 'live' }

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  if (!keyId || !keySecret) return null
  return { keyId, keySecret, mode: keyId.startsWith('rzp_live_') ? 'live' : 'test' }
}

export type RazorpayOrder = {
  id: string
  amount: number // paise
  amount_paid: number
  currency: string
  receipt: string | null
  status: 'created' | 'attempted' | 'paid'
  notes: Record<string, string>
}

export type RazorpayPayment = {
  id: string
  order_id: string
  amount: number // paise
  currency: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  method: string | null
  email: string | null
  contact: string | null
}

async function call<T>(cfg: RazorpayConfig, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const desc = json?.error?.description || `HTTP ${res.status}`
    throw new Error(`Razorpay ${path}: ${desc}`)
  }
  return json as T
}

export function createOrder(
  cfg: RazorpayConfig,
  input: { amountPaise: number; receipt: string; notes: Record<string, string> },
) {
  return call<RazorpayOrder>(cfg, '/orders', {
    method: 'POST',
    body: { amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes },
  })
}

export const fetchOrder = (cfg: RazorpayConfig, orderId: string) =>
  call<RazorpayOrder>(cfg, `/orders/${encodeURIComponent(orderId)}`)

export const fetchPayment = (cfg: RazorpayConfig, paymentId: string) =>
  call<RazorpayPayment>(cfg, `/payments/${encodeURIComponent(paymentId)}`)

/** Accounts with auto-capture off leave payments `authorized`; capture them so the money actually settles. */
export const capturePayment = (cfg: RazorpayConfig, paymentId: string, amountPaise: number) =>
  call<RazorpayPayment>(cfg, `/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: 'POST',
    body: { amount: amountPaise, currency: 'INR' },
  })

function hmacMatches(secret: string, payload: string, signature: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(signature ?? ''), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(
  keySecret: string,
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  return hmacMatches(keySecret, `${orderId}|${paymentId}`, signature)
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret) in X-Razorpay-Signature. */
export function verifyWebhookSignature(webhookSecret: string, rawBody: string, signature: string): boolean {
  return hmacMatches(webhookSecret, rawBody, signature)
}

/** ₹ (numeric column) → paise, without float drift (499.99 * 100 = 49998.99…). */
export function rupeesToPaise(rupees: number | string): number {
  return Math.round(Number(rupees) * 100)
}
