#!/usr/bin/env node
/**
 * READ-ONLY preflight for the QSoS Hospital Dashboard build.
 *
 * migrations/01_schema/02_tables.sql is provably drifted from live (sos_requests
 * has no destination_hospital_id there despite the DDL declaring one, status_history
 * is declared TEXT but is live jsonb, deploy.sql replays only 11 of 37 99_updates
 * files). So every assumption the migration would rest on is probed against live
 * before any DDL gets written.
 *
 * Writes nothing. Every probe is a SELECT or a deliberately-failing RPC call.
 */
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = {}
for (const line of fs.readFileSync('.env.netlify', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !SVC) { console.error('Missing SUPABASE URL / SERVICE_ROLE_KEY in .env.netlify'); process.exit(1) }

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const svc = createClient(URL, SVC, opts)
const anon = createClient(URL, ANON, opts)

/** Does table.column exist? 42703 = undefined_column, 42P01 = undefined_table. */
async function col(table, name) {
  const { error } = await svc.from(table).select(name).limit(1)
  if (!error) return 'present'
  if (error.code === '42703') return 'ABSENT'
  if (error.code === '42P01') return 'NO SUCH TABLE'
  return `? ${error.code} ${error.message}`
}

async function probeCols(table, names) {
  console.log(`\n--- ${table} ---`)
  for (const n of names) console.log(`  ${n.padEnd(28)} ${await col(table, n)}`)
}

;(async () => {
  console.log('QSoS Hospital Dashboard — live preflight')
  console.log('Project:', URL)

  // 1. Can we run arbitrary SQL at all? Decides whether the migration is
  //    self-applying or has to be pasted into the SQL editor by hand.
  console.log('\n=== 1. arbitrary-SQL RPC availability ===')
  for (const fn of ['exec_sql', 'exec', 'execute_sql', 'run_sql', 'sql']) {
    const { error } = await svc.rpc(fn, { sql: 'select 1' })
    console.log(`  ${fn.padEnd(12)} ${!error ? 'AVAILABLE' : `${error.code || ''} ${String(error.message).slice(0, 60)}`}`)
  }

  // 2. Columns the triggers and the dashboard will read.
  console.log('\n=== 2. column presence (live) ===')
  await probeCols('sos_requests', [
    'id', 'patient_id', 'status', 'status_history', 'driver_id', 'assigned_driver_id',
    'destination_hospital_id', 'estimated_arrival_time', 'created_at', 'updated_at',
    'requested_at', 'completed_at', 'patient_name', 'triggered_by', 'expires_at',
  ])
  await probeCols('patients', [
    'user_id', 'blood_group', 'allergies', 'primary_hospital_id', 'secondary_hospital_id',
    'insurance_provider', 'insurance_policy_number', 'insurance_valid_till',
    'known_conditions', 'current_medications', 'organ_donor',
  ])
  await probeCols('hospitals', ['id', 'name', 'hospital_type', 'status', 'admin_email', 'specialisations', 'qsos_eligibility'])
  await probeCols('users', ['id', 'auth_user_id', 'role', 'is_active', 'full_name', 'phone', 'avatar_url'])

  // 3. Tables this build intends to create — must not already exist.
  console.log('\n=== 3. new tables (expect NO SUCH TABLE) ===')
  for (const t of ['hospital_admins', 'hospital_onboarding_tokens', 'hospital_patient_registrations',
                   'hospital_sos_alerts', 'hospital_notifications', 'hospital_audit_log']) {
    const { error } = await svc.from(t).select('*').limit(1)
    console.log(`  ${t.padEnd(34)} ${error ? (error.code === '42P01' ? 'absent (good)' : `${error.code} ${error.message}`) : 'ALREADY EXISTS'}`)
  }

  // 4. status_history real shape. The trigger has to parse this; it is jsonb
  //    holding a JSON *string scalar* containing the array, not a jsonb array.
  console.log('\n=== 4. status_history shape ===')
  const { data: sh, error: shErr } = await svc
    .from('sos_requests').select('id, status, status_history').limit(8)
  if (shErr) console.log('  ERROR', shErr.code, shErr.message)
  else {
    for (const r of sh || []) {
      const v = r.status_history
      let shape = v === null ? 'null' : Array.isArray(v) ? 'jsonb ARRAY' : typeof v === 'string' ? 'STRING scalar' : typeof v
      let hasHosp = false
      try {
        const arr = typeof v === 'string' ? JSON.parse(v) : v
        hasHosp = Array.isArray(arr) && arr.some(e => e && e.hospitalDetails)
      } catch { shape += ' (unparseable)' }
      console.log(`  ${String(r.status).padEnd(22)} ${shape.padEnd(16)} hospitalDetails:${hasHosp}`)
    }
  }

  // 5. Live distribution of sos status values — confirms the CHECK body in use.
  console.log('\n=== 5. sos_requests.status values in use ===')
  const { data: st } = await svc.from('sos_requests').select('status').limit(1000)
  const counts = {}
  for (const r of st || []) counts[r.status] = (counts[r.status] || 0) + 1
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(k).padEnd(24)} ${v}`)

  // 6. RLS Phase-1 helper. Plan calls for CREATE OR REPLACE of this.
  console.log('\n=== 6. current_app_user_id() ===')
  {
    const { error } = await svc.rpc('current_app_user_id')
    console.log('  ', error ? `${error.code || ''} ${String(error.message).slice(0, 80)}` : 'EXISTS')
  }

  // 7. Is anon still able to read core tables? (the known live PII exposure)
  console.log('\n=== 7. anon readability (RLS state proxy) ===')
  for (const t of ['users', 'patients', 'sos_requests', 'hospitals', 'emergency_contacts', 'notifications']) {
    const { data, error } = await anon.from(t).select('*').limit(1)
    console.log(`  ${t.padEnd(20)} ${error ? `blocked (${error.code})` : data && data.length ? 'READABLE BY ANON' : 'readable, empty'}`)
  }

  // 8. Scale — how many hospitals/patients the dashboard will actually serve.
  console.log('\n=== 8. counts ===')
  for (const [t, f] of [['hospitals', null], ['patients', 'primary_hospital_id'], ['patients', 'secondary_hospital_id']]) {
    let q = svc.from(t).select('*', { count: 'exact', head: true })
    if (f) q = q.not(f, 'is', null)
    const { count, error } = await q
    console.log(`  ${t}${f ? ` with ${f}` : ''}: ${error ? error.message : count}`)
  }
  const { count: hospUsers } = await svc.from('users').select('*', { count: 'exact', head: true }).eq('role', 'hospital')
  console.log(`  users with role='hospital': ${hospUsers ?? 'n/a (role rejected by CHECK)'}`)
})().catch(e => console.error('FATAL', e.message))
