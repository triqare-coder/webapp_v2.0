import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { hashOnboardingToken, rejectOnboardingToken } from '@/lib/hospital/onboardingToken'
import { hospitalPasswordSchema } from '@/lib/hospital/password'

/**
 * POST /api/hospital/onboarding/set-password   { token, password }
 *
 * Completes the hospital first login (US-001 AC2): sets the admin's real
 * password and burns the token. The temporary password is invalidated by
 * construction — it is the thing being replaced.
 *
 * PUBLIC by necessity (see verify-token). The token is the sole credential, so
 * it is re-validated here rather than trusting that the form already checked:
 * the form is not the only thing that can POST to this route.
 */
export async function POST(request: NextRequest) {
  let token: string
  let password: string
  try {
    const body = await request.json()
    token = String(body?.token ?? '')
    password = String(body?.password ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Policy enforced server-side with the same schema the form uses, so a caller
  // who bypasses the form cannot set a weaker password than it advertises.
  const parsed = hospitalPasswordSchema.safeParse(password)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid password' }, { status: 400 })
  }

  const admin = createServerClient()
  const { data: row } = await admin
    .from('hospital_onboarding_tokens')
    .select('id, hospital_id, expires_at, used_at')
    .eq('token_hash', hashOnboardingToken(token))
    .maybeSingle()

  const rejection = rejectOnboardingToken(row ?? null)
  if (rejection) {
    return NextResponse.json(
      {
        error:
          rejection === 'expired'
            ? 'This setup link has expired. Contact support@triqare.com for a new one.'
            : 'This setup link is no longer valid. Contact support@triqare.com.',
        reason: rejection,
      },
      { status: 400 },
    )
  }

  const { data: link } = await admin
    .from('hospital_admins')
    .select('user_id, email')
    .eq('hospital_id', row!.hospital_id)
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'No admin account is linked to this hospital.' }, { status: 404 })
  }

  const { data: appUser } = await admin
    .from('users')
    .select('auth_user_id')
    .eq('id', link.user_id)
    .maybeSingle()
  if (!appUser?.auth_user_id) {
    return NextResponse.json({ error: 'This admin account has no login attached.' }, { status: 404 })
  }

  const { error: pwError } = await admin.auth.admin.updateUserById(appUser.auth_user_id, { password })
  if (pwError) {
    return NextResponse.json({ error: `Could not set the password: ${pwError.message}` }, { status: 500 })
  }

  // Burn the token only AFTER the password is actually changed. Marking it first
  // would strand the admin with a dead link and an unchanged password if the
  // update failed. Scoped to used_at IS NULL so two concurrent submits cannot
  // both consume it.
  const { error: burnError } = await admin
    .from('hospital_onboarding_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row!.id)
    .is('used_at', null)
  if (burnError) console.error('[hospital-onboarding] could not burn token:', burnError.message)

  // The email is returned so the client can sign in immediately with the
  // password just set; it is only reachable by presenting a valid one-time token.
  return NextResponse.json({ success: true, email: link.email })
}
