import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'

/**
 * One-time onboarding tokens for the hospital first-login link (US-001).
 *
 * SERVER-ONLY. The raw token is emailed and then forgotten: only its sha256
 * hash is stored, so a leaked table dump yields no working login links. A token
 * is single-use (used_at) and expires after 72 hours; re-sending the onboarding
 * email issues a fresh one and invalidates every prior token for the hospital.
 */
export const DEFAULT_TOKEN_TTL_HOURS = 72

export function generateOnboardingToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashOnboardingToken(token) }
}

export function hashOnboardingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Constant-time compare, so a token cannot be recovered by timing the lookup. */
export function tokenHashMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function tokenExpiryFrom(now: Date, ttlHours: number = DEFAULT_TOKEN_TTL_HOURS): Date {
  return new Date(now.getTime() + ttlHours * 60 * 60 * 1000)
}

export type TokenRejection = 'not_found' | 'expired' | 'already_used'

/**
 * Why a token cannot be used, or null if it is good. Kept pure so the rules are
 * unit-testable without a database.
 */
export function rejectOnboardingToken(
  row: { expires_at: string | Date; used_at: string | Date | null } | null,
  now: Date = new Date(),
): TokenRejection | null {
  if (!row) return 'not_found'
  if (row.used_at) return 'already_used'
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired'
  return null
}

/**
 * Temporary password for the onboarding email. Satisfies the same policy the
 * admin will later be held to, so the emailed credential is never weaker than
 * the one it is replaced by. Ambiguous glyphs (O/0, l/1) are excluded because
 * this password gets read off a screen and retyped.
 */
export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const specials = '!@#$%*?'
  const all = upper + lower + digits + specials
  const pick = (set: string) => set[randomInt(set.length)]

  const required = [pick(upper), pick(lower), pick(digits), pick(specials)]
  const rest = Array.from({ length: 8 }, () => pick(all))
  const chars = [...required, ...rest]

  // Fisher-Yates, so the required characters are not always in the first four slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
