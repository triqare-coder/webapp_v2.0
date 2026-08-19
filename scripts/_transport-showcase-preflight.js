#!/usr/bin/env node
/*
 * READ-ONLY preflight for the transport-company dashboard showcase.
 *
 *   node scripts/_transport-showcase-preflight.js
 *   node scripts/_transport-showcase-preflight.js --watch      (listen 120s for live events)
 *
 * Part 1 (service role) — is the demo data in place?
 *   transport companies, their drivers, today's SOS rows.
 * Part 2 (anon key, the SAME key the browser dashboard uses) — can the dashboard
 *   READ those tables? postgres_changes honours RLS, so an anon SELECT that
 *   returns nothing means the live screen will also receive nothing.
 * Part 3 (--watch) — subscribe exactly like the dashboard does and print every
 *   event that arrives. Toggle the driver app Online/Offline while this runs: a
 *   silent watcher means Realtime is NOT enabled for that table (fix it in
 *   Supabase → Database → Replication → supabase_realtime).
 *
 * Nothing here writes to the database.
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.resolve(__dirname, '..')
const ENV_FILE = ['.env.netlify', '.env.local', '.env'].find((f) => fs.existsSync(path.join(ROOT, f)))
if (!ENV_FILE) {
  console.error('No .env.netlify / .env.local / .env found — run this from the web-production checkout.')
  process.exit(1)
}
const env = {}
for (const line of fs.readFileSync(path.join(ROOT, ENV_FILE), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON || !SERVICE) {
  console.error(`${ENV_FILE} is missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY`)
  process.exit(1)
}

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin = createClient(URL, SERVICE, opts)
const anon = createClient(URL, ANON, opts)

const WATCH = process.argv.includes('--watch')
const LIVE_TABLES = ['drivers', 'sos_requests', 'sos_request_assigned']
const ACTIVE_EXCLUDED = '("Arrived at Hospital","Cancelled")'

const ok = (s) => `  ✅ ${s}`
const bad = (s) => `  ❌ ${s}`
const warn = (s) => `  ⚠️  ${s}`

async function demoData() {
  console.log(`\n── 1. Demo data (service role, ${ENV_FILE}) ───────────────────────────`)

  const { data: companies, error: cErr } = await admin
    .from('transport_companies')
    .select('user_id, company_name, is_verified')
    .order('company_name')
  if (cErr) return console.log(bad(`transport_companies: ${cErr.code} ${cErr.message}`))
  if (!companies.length) return console.log(bad('No transport companies exist — nothing to demo.'))

  console.log(ok(`${companies.length} transport compan${companies.length === 1 ? 'y' : 'ies'}`))

  for (const c of companies) {
    const { data: drivers } = await admin
      .from('drivers')
      .select('user_id, status, is_available, current_request_id, latitude, longitude')
      .eq('transport_company_id', c.user_id)

    const list = drivers ?? []
    if (!list.length) {
      console.log(`     · ${c.company_name}: no drivers — cannot be the demo company`)
      continue
    }

    const ids = list.map((d) => d.user_id)
    const { data: users } = await admin.from('users').select('id, full_name, email, fcm_token_updated_at').in('id', ids)
    const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

    const { count: active } = await admin
      .from('sos_requests')
      .select('*', { count: 'exact', head: true })
      .in('driver_id', ids)
      .not('status', 'in', ACTIVE_EXCLUDED)

    console.log(
      `\n     ${c.company_name}${c.is_verified ? '' : ' (unverified)'} — ${list.length} driver(s), ${active ?? 0} active case(s)`,
    )
    for (const d of list) {
      const u = byId[d.user_id] || {}
      const gps = d.latitude && d.longitude ? 'GPS' : 'no GPS'
      const app = u.fcm_token_updated_at ? `app seen ${u.fcm_token_updated_at.slice(0, 10)}` : 'never opened the app'
      console.log(
        `       · ${(u.full_name || 'Unknown').padEnd(22)} ${String(d.status).padEnd(10)} ` +
          `${d.current_request_id ? 'on a case' : 'free'.padEnd(9)} ${gps}, ${app}`,
      )
    }
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: recent } = await admin
    .from('sos_requests')
    .select('id, status, requested_at, driver_id, patient_name')
    .gte('requested_at', since)
    .order('requested_at', { ascending: false })
    .limit(10)
  console.log(`\n  SOS rows in the last 24h: ${recent?.length ?? 0}`)
  for (const r of recent ?? []) {
    console.log(
      `       · ${r.requested_at?.slice(11, 19)} ${String(r.status).padEnd(20)} ` +
        `${r.driver_id ? 'driver assigned' : 'UNASSIGNED'}  ${r.patient_name || ''}`,
    )
  }
}

async function anonReadable() {
  console.log('\n── 2. Anon-key reads (what the browser dashboard can actually see) ───')
  for (const t of LIVE_TABLES) {
    const { count, error } = await anon.from(t).select('*', { count: 'exact', head: true })
    if (error) {
      console.log(bad(`${t}: ${error.code} ${error.message} → realtime events will be filtered out by RLS`))
    } else {
      console.log(ok(`${t}: readable (${count ?? 0} rows visible)`))
    }
  }
}

function watchLive() {
  console.log('\n── 3. Live watch (120s) — subscribing exactly like the dashboard ─────')
  console.log('  Now change something: toggle the driver app Online/Offline, or raise an SOS.')
  console.log('  Every event that reaches the browser will print here.\n')

  let seen = 0
  const channel = anon.channel('showcase-preflight')
  for (const t of LIVE_TABLES) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload) => {
      seen += 1
      const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old
      const detail = [row?.status, row?.is_available !== undefined ? `available=${row.is_available}` : null]
        .filter(Boolean)
        .join(' ')
      console.log(`  📡 ${new Date().toLocaleTimeString()}  ${payload.eventType.padEnd(6)} ${t.padEnd(21)} ${detail}`)
    })
  }
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') console.log(ok('subscribed — listening…\n'))
    else if (status !== 'CLOSED') console.log(warn(`channel status: ${status}`))
  })

  setTimeout(() => {
    console.log('')
    if (seen) console.log(ok(`${seen} live event(s) received — Realtime is working for the showcase.`))
    else
      console.log(
        bad(
          'No events in 120s. If you DID change something, Realtime is off for these tables:\n' +
            '     Supabase → Database → Replication → supabase_realtime → enable drivers, sos_requests, sos_request_assigned.',
        ),
      )
    process.exit(seen ? 0 : 1)
  }, 120_000)
}

;(async () => {
  console.log(`Transport showcase preflight — ${URL}`)
  await demoData()
  await anonReadable()
  if (WATCH) watchLive()
  else console.log('\n  Re-run with --watch to prove live events reach the browser.\n')
})()
