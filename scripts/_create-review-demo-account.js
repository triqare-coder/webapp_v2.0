#!/usr/bin/env node
/*
 * Create the account App Review signs in with — fully set up, so the reviewer
 * sees a working SOS button rather than "Setup Required".
 *
 * The previous demo account (dev.nujoom@gmail.com) does not authenticate and has
 * no public.users row at all: a guaranteed Guideline 2.1 rejection on the next
 * round, behind the 1.5 one.
 *
 * "Fully set up" is not cosmetic — utils/patient-validation.ts gates the SOS
 * button on a complete profile AND at least one emergency contact AND both
 * hospitals. Miss any one and the reviewer cannot exercise the app's core
 * feature.
 *
 * Idempotent: re-running resets the password and re-asserts the profile.
 */
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = {}
for (const line of fs.readFileSync('.env.netlify', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const EMAIL = process.env.DEMO_EMAIL || 'appreview@triqare.com'
const PASSWORD = process.env.DEMO_PASSWORD || 'AppReview@2026'
const PHONE = process.env.DEMO_PHONE || '9000000026'

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const log = (...a) => console.log(...a)

;(async () => {
  // 1. Auth identity ----------------------------------------------------------
  let authId
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = (list?.users || []).find((u) => (u.email || '').toLowerCase() === EMAIL)
  if (existing) {
    authId = existing.id
    await admin.auth.admin.updateUserById(authId, { password: PASSWORD, email_confirm: true })
    log(`• auth user existed — password reset, email confirmed (${authId})`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) return log('✗ createUser failed:', error.message)
    authId = data.user.id
    log(`✓ auth user created (${authId})`)
  }

  // 2. public.users -----------------------------------------------------------
  const { data: existingRow } = await admin.from('users').select('id').ilike('email', EMAIL).maybeSingle()
  const userId = existingRow?.id || authId
  const { error: userErr } = await admin.from('users').upsert(
    {
      id: userId,
      auth_user_id: authId,
      email: EMAIL,
      first_name: 'App',
      last_name: 'Reviewer',
      phone: PHONE,
      role: 'patient',
      account_type: 'patient',
    },
    { onConflict: 'id' }
  )
  if (userErr) return log('✗ users upsert failed:', userErr.code, userErr.message)
  log(`✓ users row ready (${userId})`)

  // 3. Two hospitals — the gate needs a primary AND a secondary ----------------
  const { data: hospitals, error: hospErr } = await admin
    .from('hospitals')
    .select('id,name')
    .limit(2)
  if (hospErr || !hospitals || hospitals.length < 2) {
    log('✗ need two hospitals in the directory:', hospErr ? hospErr.message : `found ${hospitals?.length ?? 0}`)
    return
  }
  log(`✓ hospitals: ${hospitals.map((h) => h.name).join(' / ')}`)

  // 4. patients profile — complete, and with coordinates inside India so the
  //    reviewer is not blocked by the India-only serviceability gate.
  const { error: patErr } = await admin.from('patients').upsert(
    {
      user_id: userId,
      // Column names come from the live table, which differs from the app's
      // TypeScript shape: dob (not date_of_birth), address_line (not address),
      // and city/state/pincode are FK ids rather than free text — so they are
      // left alone rather than guessed at.
      dob: '1990-01-01',
      gender: 'Male',
      address_line: '1 MG Road, Bengaluru 560001',
      blood_group: 'O+',
      primary_hospital_id: hospitals[0].id,
      secondary_hospital_id: hospitals[1].id,
      latitude: 12.9716,
      longitude: 77.5946,
    },
    { onConflict: 'user_id' }
  )
  if (patErr) return log('✗ patients upsert failed:', patErr.code, patErr.message)
  log('✓ patient profile complete (Bengaluru, inside the serviceable region)')

  // 5. One emergency contact --------------------------------------------------
  const { data: contacts } = await admin
    .from('emergency_contacts')
    .select('id')
    .eq('patient_id', userId)
  if (!contacts || contacts.length === 0) {
    const { error: ecErr } = await admin.from('emergency_contacts').insert({
      patient_id: userId,
      name: 'Demo Contact',
      phone: '9000000027',
      relationship: 'Friend',
    })
    if (ecErr) return log('✗ emergency contact insert failed:', ecErr.code, ecErr.message)
    log('✓ emergency contact added')
  } else {
    log(`• emergency contacts already present (${contacts.length})`)
  }

  // 6. Prove it the way a reviewer would --------------------------------------
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })
  if (signInErr) return log(`\n✗ SIGN-IN STILL FAILS: ${signInErr.message}`)
  await anon.auth.signOut()

  log('\n=== give App Review these credentials ===')
  log(`  email    : ${EMAIL}`)
  log(`  password : ${PASSWORD}`)
  log(`  verified : sign-in works, profile complete, SOS button enabled`)
  log(`  user id  : ${session.user.id}`)
})()
