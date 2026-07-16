import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { sendEmergencyContactInviteEmail } from '@/lib/email/sendApplicationEmails'

// POST /api/emergency-contacts/invite  (called by the mobile app)
//
// Emails an invitation to a newly-added emergency contact so they can create
// their own QSoS account. Never leaks whether the address exists elsewhere and
// never blocks the caller — email send is best-effort (the sender no-ops when
// RESEND_API_KEY is absent).

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LEN = 120

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= MAX_LEN ? t : null
}

export async function POST(req: NextRequest) {
  // Rate-limit by IP so this can't be turned into an email-spam relay.
  const ip = getClientIp(req.headers)
  if (!(await checkRateLimit(ip, 'ec-invite', 20, '1 hour'))) {
    return NextResponse.json(
      { error: 'Too many invitations from this network. Please try again later.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = clean(body.email)
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid contact email is required' }, { status: 400 })
  }

  const contactName = clean(body.contactName)
  const inviterName = clean(body.inviterName)

  // Fire-and-forget semantics: the send helper swallows its own errors, but wrap
  // anyway so a thrown import/config error can't 500 the mobile client.
  try {
    await sendEmergencyContactInviteEmail({ email, contactName, inviterName })
  } catch (err) {
    console.error(
      '[ec-invite] send failed (non-blocking):',
      err instanceof Error ? err.message : 'unknown',
    )
  }

  // Always 200 on a well-formed request — the contact was still saved on the
  // client regardless of whether the invite email actually went out.
  return NextResponse.json({ success: true })
}
