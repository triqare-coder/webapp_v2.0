import { NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { sendAppFeedbackEmail } from '@/lib/email/sendApplicationEmails'

// POST /api/app-feedback  (called by the mobile app)
//
// Emails a user's in-app feedback to the Triqare team so they never have to
// leave the app for a mail client. Best-effort send; always answers on a
// well-formed request. Public (no Clerk session — mobile has none), so it's
// exempted in middleware.ts and rate-limited here.

export const runtime = 'nodejs'

const MAX_MESSAGE = 5000
const MAX_FIELD = 200

function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t.slice(0, max) : null
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  if (!(await checkRateLimit(ip, 'app-feedback', 20, '1 hour'))) {
    return NextResponse.json(
      { error: 'Too many submissions from this network. Please try again later.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = clip(body.message, MAX_MESSAGE)
  if (!message) {
    return NextResponse.json({ error: 'Feedback message is required' }, { status: 400 })
  }

  try {
    await sendAppFeedbackEmail({
      category: clip(body.category, MAX_FIELD) ?? 'General',
      message,
      name: clip(body.name, MAX_FIELD),
      email: clip(body.email, MAX_FIELD),
      phone: clip(body.phone, MAX_FIELD),
      userId: clip(body.userId, MAX_FIELD),
      platform: clip(body.platform, MAX_FIELD),
      appVersion: clip(body.appVersion, MAX_FIELD),
    })
  } catch (err) {
    console.error(
      '[app-feedback] send failed (non-blocking):',
      err instanceof Error ? err.message : 'unknown',
    )
  }

  return NextResponse.json({ success: true })
}
