import { createServerClient } from '@/lib/supabase/server'
import { createSupabaseAuthUser } from '@/lib/clerk-user-creation'
import { rollbackProvisionedUser } from '@/lib/provisionRollback'
import {
  DEFAULT_TOKEN_TTL_HOURS,
  generateOnboardingToken,
  generateTemporaryPassword,
  tokenExpiryFrom,
} from '@/lib/hospital/onboardingToken'
import { sendHospitalOnboardingEmail } from '@/lib/email/sendHospitalOnboardingEmail'

/**
 * Provision a Hospital Admin account and send the onboarding email (US-001).
 *
 * SERVER-ONLY. Used both by the auto-fire on hospital creation (OQ-004 default)
 * and by the explicit "Re-send Onboarding Email" action, which is why issuing a
 * token invalidates every earlier one for the hospital.
 *
 * The login itself is created through createSupabaseAuthUser(), which already
 * carries the fix for GoTrue applying app_metadata in a second statement — the
 * bug that landed every admin-provisioned account as a `patient`.
 */

export interface ProvisionResult {
  ok: boolean
  error?: string
  emailSent?: boolean
  emailReason?: 'not_configured' | 'send_failed'
  expiresAt?: string
  /** Present only when the account was created by THIS call. */
  createdAdminUserId?: string
}

async function tokenTtlHours(): Promise<number> {
  const admin = createServerClient()
  const { data } = await admin
    .from('configurations')
    .select('value')
    .eq('key', 'hospital_onboarding_token_hours')
    .maybeSingle()
  const parsed = Number.parseInt(String(data?.value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOKEN_TTL_HOURS
}

/** Is the onboarding email supposed to fire automatically on save? (OQ-004) */
export async function onboardingAutofireEnabled(): Promise<boolean> {
  const admin = createServerClient()
  const { data } = await admin
    .from('configurations')
    .select('value')
    .eq('key', 'hospital_onboarding_email_autofire')
    .maybeSingle()
  return String(data?.value ?? 'true').toLowerCase() !== 'false'
}

/**
 * Issue a fresh 72-hour token and email it. Any token previously issued for the
 * hospital is marked used, so a re-send genuinely invalidates the old link
 * rather than leaving two working ones (US-001 AC4).
 */
export async function issueOnboardingEmail(params: {
  hospitalId: string
  hospitalName: string
  adminEmail: string
  temporaryPassword: string
}): Promise<{ emailSent: boolean; emailReason?: 'not_configured' | 'send_failed'; expiresAt: string; error?: string }> {
  const admin = createServerClient()
  const ttl = await tokenTtlHours()
  const expiresAt = tokenExpiryFrom(new Date(), ttl)
  const { token, tokenHash } = generateOnboardingToken()

  // Invalidate first. If the insert below fails the hospital simply has no live
  // token, which is recoverable by re-sending; the opposite order could leave a
  // superseded link working.
  await admin
    .from('hospital_onboarding_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('hospital_id', params.hospitalId)
    .is('used_at', null)

  const { error: tokenError } = await admin.from('hospital_onboarding_tokens').insert({
    hospital_id: params.hospitalId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  })
  if (tokenError) {
    return { emailSent: false, expiresAt: expiresAt.toISOString(), error: tokenError.message }
  }

  const result = await sendHospitalOnboardingEmail({
    hospitalName: params.hospitalName,
    adminEmail: params.adminEmail,
    temporaryPassword: params.temporaryPassword,
    token,
    expiryHours: ttl,
  })

  return { emailSent: result.sent, emailReason: result.reason, expiresAt: expiresAt.toISOString() }
}

/**
 * Create the Hospital Admin login for a hospital (if it does not have one) and
 * send the onboarding email.
 *
 * Re-sending for a hospital that already has an admin issues a fresh token but
 * does NOT reset the password: an admin who has already set their own password
 * must not have it silently replaced because someone clicked re-send. In that
 * case the email's temporary-password line is omitted by the caller passing the
 * existing account through — see the route.
 */
export async function provisionHospitalAdmin(params: {
  hospitalId: string
  hospitalName: string
  adminEmail: string
}): Promise<ProvisionResult> {
  const { hospitalId, hospitalName } = params
  const adminEmail = params.adminEmail.trim().toLowerCase()
  const admin = createServerClient()

  const { data: existing } = await admin
    .from('hospital_admins')
    .select('id, user_id')
    .eq('hospital_id', hospitalId)
    .maybeSingle()

  if (existing) {
    // Already provisioned. Re-send only: a fresh token, and a fresh temporary
    // password applied to the existing login so the emailed credential works.
    const temporaryPassword = generateTemporaryPassword()
    const { data: appUser } = await admin
      .from('users').select('auth_user_id').eq('id', existing.user_id).maybeSingle()

    if (appUser?.auth_user_id) {
      const { error: pwError } = await admin.auth.admin.updateUserById(appUser.auth_user_id, {
        password: temporaryPassword,
      })
      if (pwError) return { ok: false, error: `Could not reset the temporary password: ${pwError.message}` }
    }

    const sent = await issueOnboardingEmail({ hospitalId, hospitalName, adminEmail, temporaryPassword })
    if (sent.error) return { ok: false, error: sent.error }
    return { ok: true, emailSent: sent.emailSent, emailReason: sent.emailReason, expiresAt: sent.expiresAt }
  }

  // An account may already exist for this address from another role. Reusing it
  // would silently hand a hospital dashboard to whoever owns that mailbox.
  const { data: emailOwner } = await admin
    .from('users').select('id, role').ilike('email', adminEmail).maybeSingle()
  if (emailOwner) {
    return {
      ok: false,
      error: `An account already exists for ${adminEmail} (role: ${emailOwner.role}). Use a different admin email address.`,
    }
  }

  const temporaryPassword = generateTemporaryPassword()
  const created = await createSupabaseAuthUser(
    adminEmail, `${hospitalName} Admin`, 'hospital', undefined, temporaryPassword,
  )
  if (!created.success || !created.appUserId) {
    // Best-effort cleanup: a half-provisioned login blocks every retry, because
    // the email pre-check above would then refuse.
    await rollbackProvisionedUser({ authUserId: created.authUserId, appUserId: created.appUserId })
    return { ok: false, error: created.error || 'Could not create the hospital admin account' }
  }

  const { error: linkError } = await admin.from('hospital_admins').insert({
    hospital_id: hospitalId, user_id: created.appUserId, email: adminEmail,
  })
  if (linkError) {
    await rollbackProvisionedUser({ authUserId: created.authUserId, appUserId: created.appUserId })
    return { ok: false, error: `Could not link the admin to the hospital: ${linkError.message}` }
  }

  const sent = await issueOnboardingEmail({ hospitalId, hospitalName, adminEmail, temporaryPassword })
  if (sent.error) return { ok: false, error: sent.error }

  return {
    ok: true,
    emailSent: sent.emailSent,
    emailReason: sent.emailReason,
    expiresAt: sent.expiresAt,
    createdAdminUserId: created.appUserId,
  }
}
