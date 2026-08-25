import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServerClient } from '@/lib/supabase/server'
import { provisionHospitalAdmin } from '@/lib/hospital/provisionHospitalAdmin'

/**
 * POST /api/admin/hospitals/[id]/onboarding-email
 *
 * "Send Onboarding Email" / "Re-send Onboarding Email" (US-001 AC4). Issues a
 * fresh 72-hour token, invalidates every previous one, resets the temporary
 * password so the emailed credential actually works, and sends the mail.
 *
 * This is also OQ-004's manual trigger: it stays wired whether or not the
 * auto-fire-on-save config is enabled, so onboarding is never stuck behind a
 * setting.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  const { id } = await params
  const admin = createServerClient()

  const { data: hospital, error } = await admin
    .from('hospitals')
    .select('id, name, admin_email')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!hospital) return NextResponse.json({ error: 'Hospital not found' }, { status: 404 })
  if (!hospital.admin_email) {
    return NextResponse.json(
      { error: 'This hospital has no admin email address. Add one before sending the onboarding email.' },
      { status: 400 },
    )
  }

  const result = await provisionHospitalAdmin({
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    adminEmail: hospital.admin_email,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Report the email outcome honestly rather than implying a send that a
  // missing RESEND_API_KEY silently skipped.
  return NextResponse.json({
    success: true,
    emailSent: result.emailSent,
    emailReason: result.emailReason,
    expiresAt: result.expiresAt,
    message: result.emailSent
      ? `Onboarding email sent to ${hospital.admin_email}. The link expires ${new Date(result.expiresAt!).toUTCString()}.`
      : 'A fresh onboarding token was issued, but the email could not be sent (email is not configured on this environment).',
  })
}
