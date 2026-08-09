#!/usr/bin/env node
/*
 * READ-ONLY: can App Review actually sign in with the demo account, and does
 * that account see a working app once inside?
 *
 * The commonest App Store rejection is "we could not log in" (Guideline 2.1),
 * and this project has form: it migrated Clerk → Supabase Auth, which stranded
 * accounts that were never linked. The second commonest here would be logging in
 * successfully and finding the SOS button gated behind profile setup.
 */
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = {}
for (const line of fs.readFileSync('.env.netlify', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const EMAIL = process.env.DEMO_EMAIL || 'dev.nujoom@gmail.com'
const PASSWORD = process.env.DEMO_PASSWORD || 'Appletester@123'

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

;(async () => {
  console.log(`=== demo account: ${EMAIL} ===`)

  const { data: row } = await admin
    .from('users')
    .select('id,first_name,last_name,email,phone,role,account_type,auth_user_id')
    .ilike('email', EMAIL)
    .maybeSingle()
  console.log('public.users row:', row ? JSON.stringify(row) : 'NONE')

  console.log('\n→ signInWithPassword, exactly as the app does')
  const { data: session, error } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  })
  if (error) {
    console.log(`✗ LOGIN FAILS: ${error.message}`)
    console.log('  This alone is enough for a 2.1 rejection — App Review cannot get past sign-in.')
    return
  }
  console.log(`✓ login works — auth id ${session.user.id}, confirmed=${!!session.user.email_confirmed_at}`)

  if (!row) {
    console.log('\n✗ authenticates but has NO public.users row — the app cannot resolve a profile.')
    await anon.auth.signOut()
    return
  }

  // What the app gates the SOS button on: complete profile + >=1 emergency
  // contact + both hospitals.
  const { data: patient } = await admin
    .from('patients')
    .select('user_id,date_of_birth,gender,address,city,state,pincode,blood_group,primary_hospital_id,secondary_hospital_id')
    .eq('user_id', row.id)
    .maybeSingle()
  const { data: contacts } = await admin
    .from('emergency_contacts')
    .select('id,name,phone')
    .eq('patient_id', row.id)

  console.log('\n=== what App Review would see after logging in ===')
  console.log(' patients row      :', patient ? 'present' : 'MISSING')
  if (patient) {
    const missing = ['date_of_birth', 'gender', 'address', 'city', 'state', 'pincode', 'blood_group']
      .filter((k) => !patient[k])
    console.log(' profile gaps      :', missing.length ? missing.join(', ') : 'none')
    console.log(' primary hospital  :', patient.primary_hospital_id ? 'set' : 'NOT SET')
    console.log(' secondary hospital:', patient.secondary_hospital_id ? 'set' : 'NOT SET')
  }
  console.log(' emergency contacts:', contacts ? contacts.length : 0)

  const sosUsable =
    patient &&
    patient.primary_hospital_id &&
    patient.secondary_hospital_id &&
    contacts &&
    contacts.length > 0
  console.log(
    `\n SOS button for this account: ${sosUsable ? '✓ enabled' : '✗ GATED — reviewer sees "Setup Required", not a working SOS'}`
  )

  await anon.auth.signOut()
})()
