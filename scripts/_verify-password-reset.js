#!/usr/bin/env node
/*
 * Prove the password-reset path works, without emailing anyone.
 *
 * admin.generateLink({type:'recovery'}) mints the SAME code the recovery email
 * would carry and returns it to us instead of sending mail. Feeding that code to
 * verifyOtp is exactly what the app's forgot-password screen does, so a session
 * coming back means the whole path is sound: code minted → code accepted →
 * authenticated session in which updateUser({password}) would succeed.
 *
 * Deliberately stops short of updateUser: nothing about the account changes.
 */
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = {}
for (const line of fs.readFileSync('.env.netlify', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const EMAIL = process.env.EMAIL || 'betaqsos@gmail.com'
const APP_OTP_LENGTH = 8 // Triqare-app/app/(auth)/forgot-password.tsx

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const asClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

;(async () => {
  console.log(`→ minting a recovery code for ${EMAIL} (no email is sent)`)
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: EMAIL })
  if (error) return console.log(`✗ could not mint a recovery code: ${error.message}`)

  const otp = data?.properties?.email_otp
  const link = data?.properties?.action_link || ''
  console.log(`  code length : ${otp ? otp.length : 'none'} ${otp && otp.length === APP_OTP_LENGTH ? '✓ matches the app' : '✗ MISMATCH with the app'}`)
  console.log(`  action_link : ${link ? link.split('?')[0] : '(none)'}`)
  if (!otp) return console.log('✗ no email_otp returned — the app could never complete a reset')

  console.log('\n→ redeeming it exactly as the app does: verifyOtp({type:"recovery"})')
  const { data: session, error: verifyErr } = await asClient.auth.verifyOtp({
    email: EMAIL,
    token: otp,
    type: 'recovery',
  })
  if (verifyErr) return console.log(`✗ verifyOtp REJECTED the code: ${verifyErr.message}`)

  console.log(`✓ code accepted — session for ${session.user?.email} (id ${session.user?.id})`)
  console.log('  In the app this is the point where updateUser({password}) sets the new password.')
  console.log('  Not doing that here: the account is left exactly as it was.')

  await asClient.auth.signOut()
  console.log('✓ test session signed out')
})()
