import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TOKEN_TTL_HOURS,
  generateOnboardingToken,
  generateTemporaryPassword,
  hashOnboardingToken,
  rejectOnboardingToken,
  tokenExpiryFrom,
  tokenHashMatches,
} from '../onboardingToken'
import { hospitalPasswordSchema, passwordRuleState } from '../password'

describe('onboarding token', () => {
  it('never returns the raw token in the stored form', () => {
    const { token, tokenHash } = generateOnboardingToken()
    expect(tokenHash).not.toContain(token)
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashes deterministically so a presented token can be looked up', () => {
    const { token, tokenHash } = generateOnboardingToken()
    expect(hashOnboardingToken(token)).toBe(tokenHash)
  })

  it('issues a distinct token every time', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateOnboardingToken().token))
    expect(seen.size).toBe(200)
  })

  it('compares hashes without leaking length mismatches as a throw', () => {
    const a = hashOnboardingToken('one')
    expect(tokenHashMatches(a, a)).toBe(true)
    expect(tokenHashMatches(a, hashOnboardingToken('two'))).toBe(false)
    expect(tokenHashMatches(a, 'short')).toBe(false)
  })

  it('expires 72 hours out by default', () => {
    const now = new Date('2026-08-25T10:00:00Z')
    expect(tokenExpiryFrom(now).toISOString()).toBe('2026-08-28T10:00:00.000Z')
    expect(DEFAULT_TOKEN_TTL_HOURS).toBe(72)
  })
})

describe('token rejection rules (US-001 AC3/AC4)', () => {
  const now = new Date('2026-08-25T10:00:00Z')

  it('accepts a live, unused token', () => {
    expect(rejectOnboardingToken({ expires_at: '2026-08-26T10:00:00Z', used_at: null }, now)).toBeNull()
  })

  it('rejects an unknown token', () => {
    expect(rejectOnboardingToken(null, now)).toBe('not_found')
  })

  it('rejects an expired token', () => {
    expect(rejectOnboardingToken({ expires_at: '2026-08-25T09:59:59Z', used_at: null }, now)).toBe('expired')
  })

  it('treats the exact expiry instant as expired', () => {
    expect(rejectOnboardingToken({ expires_at: now.toISOString(), used_at: null }, now)).toBe('expired')
  })

  it('rejects a token that was already used, even while unexpired', () => {
    expect(
      rejectOnboardingToken({ expires_at: '2026-08-26T10:00:00Z', used_at: '2026-08-25T09:00:00Z' }, now),
    ).toBe('already_used')
  })

  it('reports already_used ahead of expired, so a consumed link never reads as merely stale', () => {
    expect(
      rejectOnboardingToken({ expires_at: '2026-08-24T10:00:00Z', used_at: '2026-08-23T10:00:00Z' }, now),
    ).toBe('already_used')
  })
})

describe('temporary password', () => {
  it('always satisfies the policy the admin is later held to', () => {
    for (let i = 0; i < 300; i++) {
      expect(hospitalPasswordSchema.safeParse(generateTemporaryPassword()).success).toBe(true)
    }
  })

  it('omits glyphs that are ambiguous when retyped from an email', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateTemporaryPassword()).not.toMatch(/[O0lI1]/)
    }
  })

  it('does not park the required character classes in fixed positions', () => {
    const firstChars = new Set(Array.from({ length: 200 }, () => generateTemporaryPassword()[0]))
    expect(firstChars.size).toBeGreaterThan(4)
  })
})

describe('password policy (US-001)', () => {
  it.each([
    ['Sh0rt!', 'at least 8'],
    ['alllowercase1!', 'uppercase'],
    ['NoDigitsHere!', 'number'],
    ['NoSpecial123', 'special'],
  ])('rejects %s', (pw) => {
    expect(hospitalPasswordSchema.safeParse(pw).success).toBe(false)
  })

  it('accepts a password meeting all four rules', () => {
    expect(hospitalPasswordSchema.safeParse('Pushpagiri1!').success).toBe(true)
  })

  it('reports each rule independently for the live checklist', () => {
    expect(passwordRuleState('Ab1!xxxx').every((r) => r.met)).toBe(true)
    expect(passwordRuleState('abcdefgh').filter((r) => r.met).length).toBe(1)
  })
})
