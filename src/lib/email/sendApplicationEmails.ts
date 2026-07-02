/**
 * Transactional email for driver applications (Resend).
 *
 * SERVER-ONLY. Degrades to a safe no-op (logging only the reference number,
 * never PII) when RESEND_API_KEY is absent, so submission never fails on email.
 * Resend is lazily imported so the no-op path has no hard runtime dependency.
 */

// Sender domain MUST be verified in Resend. triqare.com is verified (triqare.in is not),
// so the default sends from .com; override via EMAIL_FROM only with another verified domain.
const FROM = process.env.EMAIL_FROM || 'QSoS <noreply@triqare.com>'
const SUPPORT = 'support@triqare.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://triqare.in'

/** Escape user-provided values before interpolating into email HTML (anti-injection). */
function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  text: string
}

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // No email provider configured — do not block the flow, do not log PII.
    console.warn('[email] RESEND_API_KEY not set; skipping send for subject prefix:', subject.split(' - ')[0])
    return
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    await resend.emails.send({ from: FROM, to, subject, html, text })
  } catch (err) {
    // Email failures must never fail the request that triggered them.
    console.error('[email] send failed:', err instanceof Error ? err.message : 'unknown')
  }
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff">
    <div style="background:#cc3333;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:bold">TriQare · QSoS</div>
    <div style="padding:24px;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;color:#003366;font-size:18px">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e6e6e6;color:#999999;font-size:12px">
      © TriQare Healthtech · <a href="mailto:${SUPPORT}" style="color:#cc3333">${SUPPORT}</a>
    </div>
  </div></body></html>`
}

// ── Applicant confirmation + admin notification (on submit) ─────────────────
export async function sendSubmissionEmails(args: {
  applicationId: string
  referenceNumber: string
  fullName: string
  email: string
  phone: string
  submittedAt: string
  summary?: { vehicleType?: string; licenseType?: string; experienceYears?: number | null }
}): Promise<void> {
  const { applicationId, referenceNumber, fullName, email, phone, submittedAt, summary } = args
  const nameH = esc(fullName)
  const emailH = esc(email)
  const phoneH = esc(phone)

  const confirmText = `Dear ${fullName},

Thank you for applying to drive with QSoS. We have received your application.

Reference number: ${referenceNumber}

Our team is reviewing your documents and will get back to you within 48 hours. If you have any questions, contact us at ${SUPPORT}.

Best regards,
TriQare Team`

  // Applicant confirmation + admin notification go out concurrently. Each send()
  // swallows its own errors, so Promise.all never rejects and never blocks success.
  const sends: Promise<void>[] = []

  sends.push(send({
    to: email,
    subject: `QSoS Driver Application Received - ${referenceNumber}`,
    text: confirmText,
    html: shell('Application Received', `
      <p>Dear <strong>${nameH}</strong>,</p>
      <p>Thank you for applying to drive with QSoS. We have received your application.</p>
      <p style="background:#f5f5f5;border-radius:6px;padding:12px;text-align:center">
        Reference number<br><strong style="color:#003366;font-size:16px">${referenceNumber}</strong>
      </p>
      <p>Our team is reviewing your documents and will get back to you within <strong>48 hours</strong>.</p>
      <p>Questions? Contact us at <a href="mailto:${SUPPORT}" style="color:#cc3333">${SUPPORT}</a>.</p>
      <p>Best regards,<br>TriQare Team</p>`),
  }))

  // Admin notification — recipient(s) from ADMIN_NOTIFICATION_EMAIL (comma-separated
  // list supported, e.g. "info@triqare.com,triqare@gmail.com"); final address TBD by TriQare.
  const recipients = (process.env.ADMIN_NOTIFICATION_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (recipients.length) {
    const reviewLink = `${APP_URL}/admin/driver-applications/${applicationId}`
    const summaryLine = [
      summary?.vehicleType && `Vehicle: ${summary.vehicleType}`,
      summary?.licenseType && `License: ${summary.licenseType}`,
      summary?.experienceYears != null && `Experience: ${summary.experienceYears} yrs`,
    ]
      .filter(Boolean)
      .join(' · ')
    sends.push(send({
      to: recipients,
      subject: `New Driver Application Received - ${fullName} - ${submittedAt.slice(0, 10)}`,
      text: `New driver application.

Driver: ${fullName}
Reference: ${referenceNumber}
Date/Time: ${submittedAt}
Phone: ${phone}
Email: ${email}
Summary: ${summaryLine || 'n/a'}

View full application: ${reviewLink}`,
      html: shell('New Driver Application', `
        <p><strong>${nameH}</strong> has submitted a driver application.</p>
        <ul style="padding-left:18px">
          <li>Driver: <strong>${nameH}</strong></li>
          <li>Reference: <strong>${referenceNumber}</strong></li>
          <li>Date/Time: ${submittedAt}</li>
          <li>Phone: ${phoneH}</li>
          <li>Email: ${emailH}</li>
          ${summaryLine ? `<li>Summary: ${esc(summaryLine)}</li>` : ''}
        </ul>
        <p><a href="${reviewLink}" style="background:#cc3333;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View full application</a></p>`),
    }))
  }

  await Promise.all(sends)
}

// ── Approval ────────────────────────────────────────────────────────────────
export async function sendApprovalEmail(args: {
  referenceNumber: string
  fullName: string
  email: string
}): Promise<void> {
  const { referenceNumber, fullName, email } = args
  await send({
    to: email,
    subject: 'Congratulations! Your QSoS Driver Application is Approved',
    text: `Dear ${fullName},

Congratulations! Your QSoS driver application (${referenceNumber}) has been approved.

Next steps: [Our team will share onboarding details shortly.]

Questions? Contact ${SUPPORT}.

Welcome to the QSoS family!
- TriQare Team`,
    html: shell('Application Approved 🎉', `
      <p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Congratulations! Your QSoS driver application (<strong>${referenceNumber}</strong>) has been <strong style="color:#16a34a">approved</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px">
        <strong>Next steps</strong><br>Our team will share onboarding details shortly.
      </div>
      <p>Questions? Contact <a href="mailto:${SUPPORT}" style="color:#cc3333">${SUPPORT}</a>.</p>
      <p>Welcome to the QSoS family!<br>- TriQare Team</p>`),
  })
}

// ── Rejection ─────────────────────────────────────────────────────────────
export async function sendRejectionEmail(args: {
  referenceNumber: string
  fullName: string
  email: string
  reason: string
}): Promise<void> {
  const { referenceNumber, fullName, email, reason } = args
  await send({
    to: email,
    subject: 'QSoS Driver Application - Action Required',
    text: `Dear ${fullName},

Thank you for your interest in driving with QSoS. After reviewing your application (${referenceNumber}), we are unable to approve it at this time.

Reason(s) for rejection:
${reason}

You are welcome to reapply once the above is addressed: ${APP_URL}/drivers

Questions? Contact ${SUPPORT}.

Regards,
TriQare Team`,
    html: shell('Action Required', `
      <p>Dear <strong>${esc(fullName)}</strong>,</p>
      <p>Thank you for your interest in driving with QSoS. After reviewing your application (<strong>${referenceNumber}</strong>), we are unable to approve it at this time.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px">
        <strong>Reason(s) for rejection:</strong><br>${esc(reason).replace(/\n/g, '<br>')}
      </div>
      <p>You are welcome to <a href="${APP_URL}/drivers" style="color:#cc3333">reapply</a> once the above is addressed.</p>
      <p>Questions? Contact <a href="mailto:${SUPPORT}" style="color:#cc3333">${SUPPORT}</a>.</p>
      <p>Regards,<br>TriQare Team</p>`),
  })
}
