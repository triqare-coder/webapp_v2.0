import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Postgres-backed rate limiter (no Redis). Counts hashed-IP attempts in a
 * sliding window via the `record_submission_attempt` SQL function. SERVER-ONLY.
 */

export type RateScope = 'submit' | 'upload' | 'ec-invite'

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex')
}

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 * Fails OPEN on limiter infrastructure errors (never block legitimate users on
 * a transient DB hiccup), logging the error without any PII.
 */
export async function checkRateLimit(
  ip: string,
  scope: RateScope,
  limit: number,
  windowText: string,
): Promise<boolean> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('record_submission_attempt', {
      p_ip_hash: hashIp(ip),
      p_scope: scope,
      p_limit: limit,
      p_window: windowText,
    })
    if (error) {
      console.error('[rateLimit] check failed, failing open:', error.message)
      return true
    }
    return data === true
  } catch (err) {
    console.error('[rateLimit] unexpected error, failing open:', err instanceof Error ? err.message : 'unknown')
    return true
  }
}
