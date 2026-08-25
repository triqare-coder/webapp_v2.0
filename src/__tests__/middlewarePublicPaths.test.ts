import { describe, it, expect } from 'vitest'
import { isPublic } from '../middleware'

/**
 * The middleware allow-list is prefix-matched, which makes near-miss entries
 * dangerous: '/api/hospitals' (the pre-existing PUBLIC directory API) sits one
 * character away from '/api/hospital' (the new, GATED dashboard API). These
 * assert the boundary rather than trusting it by eye.
 */
describe('hospital routes are gated except the onboarding entry points', () => {
  it('keeps the emailed first-login pages public', () => {
    // The visitor arrives from the onboarding email with no session; the
    // one-time token is the credential.
    expect(isPublic('/hospital/set-password')).toBe(true)
    expect(isPublic('/hospital/link-expired')).toBe(true)
    expect(isPublic('/api/hospital/onboarding/verify-token')).toBe(true)
    expect(isPublic('/api/hospital/onboarding/set-password')).toBe(true)
  })

  it.each([
    '/hospital',
    '/hospital/patients',
    '/hospital/patients/abc-123',
    '/hospital/history',
  ])('gates the dashboard page %s', (path) => {
    expect(isPublic(path)).toBe(false)
  })

  it.each([
    '/api/hospital/kpis',
    '/api/hospital/patients',
    '/api/hospital/patients/abc-123',
    '/api/hospital/alerts',
    '/api/hospital/history/export',
    '/api/hospital/notifications',
  ])('gates the dashboard API %s', (path) => {
    expect(isPublic(path)).toBe(false)
  })

  it('does not let the public /api/hospitals directory leak the /api/hospital namespace', () => {
    // Prefix matching: '/api/hospital/kpis'.startsWith('/api/hospitals') is
    // false only because 's' and '/' differ. Worth pinning.
    expect(isPublic('/api/hospitals')).toBe(true)
    expect(isPublic('/api/hospitals/stats')).toBe(true)
    expect(isPublic('/api/hospital')).toBe(false)
    expect(isPublic('/api/hospital/')).toBe(false)
  })

  it('does not let a lookalike sibling route inherit the onboarding exemption', () => {
    // The allow-list entry carries a trailing slash precisely so that a future
    // '/api/hospital/onboarding-reset' is NOT silently public.
    expect(isPublic('/api/hospital/onboarding-secrets')).toBe(false)
    expect(isPublic('/api/hospital/onboardingx')).toBe(false)
    expect(isPublic('/hospitalx/secrets')).toBe(false)
  })
})
