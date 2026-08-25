import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashOnboardingToken, rejectOnboardingToken } from '@/lib/hospital/onboardingToken'

/**
 * POST /api/hospital/onboarding/verify-token   { token }
 *
 * Checks a one-time onboarding link before the set-password form renders, so an
 * expired link shows the "contact support" page instead of a form that will fail
 * on submit (US-001 AC3).
 *
 * PUBLIC by necessity: the visitor arrives from the onboarding email with no
 * session, and the token IS the credential. It therefore returns the hospital
 * name and nothing else — never the admin's email, and never anything about a
 * hospital whose token was not presented.
 */
export async function POST(request: NextRequest) {
  let token: string
  try {
    const body = await request.json()
    token = String(body?.token ?? '')
  } catch {
    return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 400 })
  }
  if (!token) return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 400 })

  const admin = createServerClient()
  const { data: row } = await admin
    .from('hospital_onboarding_tokens')
    .select('id, hospital_id, expires_at, used_at, hospitals(name)')
    .eq('token_hash', hashOnboardingToken(token))
    .maybeSingle()

  const rejection = rejectOnboardingToken(row ?? null)
  if (rejection) {
    // 200, not 4xx: "this link is expired" is a real answer to a valid question,
    // and the page needs to render the support message rather than an error.
    return NextResponse.json({ valid: false, reason: rejection })
  }

  const hospital = row!.hospitals as unknown as { name?: string } | null
  return NextResponse.json({ valid: true, hospitalName: hospital?.name ?? 'Your hospital' })
}
