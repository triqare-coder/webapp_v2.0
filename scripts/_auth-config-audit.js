#!/usr/bin/env node
/*
 * READ-ONLY: dump every Auth email template + the URL settings, and say which
 * ones actually contain a link.
 *
 * The recovery template already carries {{ .Token }}, yet a reset email was
 * reported as arriving with a portal.triqare.com link — so either a different
 * template is in play, or the OTP settings do not match what the app expects.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/_auth-config-audit.js
 */
const fs = require('fs')

const token = (process.env.SUPABASE_ACCESS_TOKEN || '').trim()
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN=sbp_... required')
  process.exit(1)
}

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const REF = (env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1]

;(async () => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const cfg = await r.json()
  if (r.status !== 200) return console.log('ERR', r.status, JSON.stringify(cfg).slice(0, 300))

  console.log('=== URL SETTINGS ===')
  console.log(' site_url       :', cfg.site_url)
  console.log(' uri_allow_list :', cfg.uri_allow_list)

  console.log('\n=== OTP ===')
  console.log(' mailer_otp_length     :', cfg.mailer_otp_length)
  console.log(' mailer_otp_exp        :', cfg.mailer_otp_exp)
  console.log(' sms/email autoconfirm :', cfg.mailer_autoconfirm)

  console.log('\n=== EMAIL TEMPLATES ===')
  for (const key of Object.keys(cfg).filter((k) => k.startsWith('mailer_templates_'))) {
    // Not every mailer_templates_* key holds a string — some are booleans/objects,
    // which crashed the loop before it reached the templates that matter.
    const raw = cfg[key]
    const body = typeof raw === 'string' ? raw : ''
    const name = key.replace('mailer_templates_', '').replace('_content', '')
    if (!body) {
      console.log(` ${name.padEnd(14)} (empty → Supabase default template, which DOES contain a link)`)
      continue
    }
    const urls = [...body.matchAll(/https?:\/\/[^"'\s<>]+/g)].map((m) => m[0])
    const vars = [...body.matchAll(/\{\{\s*\.(\w+)\s*\}\}/g)].map((m) => m[1])
    console.log(
      ` ${name.padEnd(14)} ${String(body.length).padStart(5)} chars  vars=[${[...new Set(vars)].join(',')}]` +
        (urls.length ? `\n   ↳ URLS: ${[...new Set(urls)].join(' , ')}` : '')
    )
  }
})().catch((e) => console.error('FATAL', e.message))
