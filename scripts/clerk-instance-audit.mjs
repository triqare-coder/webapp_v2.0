#!/usr/bin/env node
/**
 * Clerk instance audit / resync.
 *
 * Context: the admin portal was configured against the Clerk TEST instance
 * (becoming-thrush-51.clerk.accounts.dev) while the mobile app authenticates
 * against the LIVE instance (clerk.triqare.com). Every user the portal created
 * therefore lives in the wrong Clerk directory and can never sign in on the app.
 * Their Supabase `users.clerk_user_id` points at a test-instance id.
 *
 * This script reports which Supabase users are orphaned against the LIVE Clerk
 * instance, and can optionally re-create them there.
 *
 * Secrets are read from the env file at runtime — never pass them on the CLI.
 *
 *   node scripts/clerk-instance-audit.mjs                 # read-only report (default)
 *   node scripts/clerk-instance-audit.mjs --fix --stale-only  # repoint stale ids only (safe first pass)
 *   node scripts/clerk-instance-audit.mjs --fix           # repoint stale ids AND create missing users in LIVE Clerk
 *   node scripts/clerk-instance-audit.mjs --fix --role=driver
 *
 * Requires in .env.netlify (or the shell env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   CLERK_SECRET_KEY   <- must be the LIVE (sk_live_…) key, post-rotation
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(file) {
  try {
    for (const line of readFileSync(resolve(__dirname, '..', file), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  } catch {
    /* file optional — fall back to the shell env */
  }
}
loadEnv('.env.netlify')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLERK_SECRET = process.env.CLERK_SECRET_KEY

const FIX = process.argv.includes('--fix')
// --stale-only: repoint STALE clerk_user_ids (safe, fixes blocked users) but do
// NOT create new accounts in LIVE Clerk for MISSING users. Use for a cautious
// first prod run, then handle MISSING separately once reviewed.
const STALE_ONLY = process.argv.includes('--stale-only')
const roleArg = process.argv.find((a) => a.startsWith('--role='))
const ROLE_FILTER = roleArg ? roleArg.split('=')[1] : null
// --email=<addr>: scope the entire run (report + fix) to a single user by email.
// Use to provision ONE real MISSING account without touching the synthetic seeds.
const emailArg = process.argv.find((a) => a.startsWith('--email='))
const EMAIL_FILTER = emailArg ? emailArg.split('=')[1].trim().toLowerCase() : null

if (!SUPABASE_URL || !SERVICE_KEY || !CLERK_SECRET) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / CLERK_SECRET_KEY')
  process.exit(1)
}

if (!CLERK_SECRET.startsWith('sk_live_')) {
  console.error(
    `CLERK_SECRET_KEY is "${CLERK_SECRET.slice(0, 8)}…" — this audit must run against the LIVE\n` +
      'instance (sk_live_…), the one the mobile app authenticates against. Aborting so we do not\n' +
      'audit the wrong Clerk directory.'
  )
  process.exit(1)
}

const clerk = (path, init) =>
  fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res.json()
}

async function patchSupabaseUser(id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`)
}

const tempPassword = () =>
  'Aa1!' + Array.from({ length: 16 }, () => Math.random().toString(36)[2] ?? 'x').join('')

const query = ROLE_FILTER
  ? `/users?select=id,email,full_name,role,clerk_user_id&role=eq.${ROLE_FILTER}`
  : '/users?select=id,email,full_name,role,clerk_user_id'

const users = (await supabase(query)).filter(
  (u) => !EMAIL_FILTER || (u.email || '').toLowerCase() === EMAIL_FILTER
)
if (EMAIL_FILTER && users.length === 0) {
  console.error(`No Supabase user found with email ${EMAIL_FILTER}. Aborting.`)
  process.exit(1)
}
console.log(
  `Supabase users${ROLE_FILTER ? ` (role=${ROLE_FILTER})` : ''}${EMAIL_FILTER ? ` (email=${EMAIL_FILTER})` : ''}: ${users.length}`
)
console.log(`Mode: ${FIX ? 'FIX — will create missing users in LIVE Clerk' : 'REPORT ONLY'}\n`)

const missing = []
const present = []

for (const u of users) {
  if (!u.email) continue
  const res = await clerk(`/users?email_address=${encodeURIComponent(u.email)}`)
  if (!res.ok) {
    console.error(`  ! Clerk lookup failed for ${u.email}: ${res.status}`)
    continue
  }
  const found = await res.json()
  if (found.length === 0) {
    missing.push(u)
  } else {
    const live = found[0]
    // Present in LIVE Clerk, but Supabase may still point at the old test-instance id.
    if (live.id !== u.clerk_user_id) {
      present.push({ ...u, liveClerkId: live.id, stale: true })
    } else {
      present.push({ ...u, liveClerkId: live.id, stale: false })
    }
  }
}

const stale = present.filter((u) => u.stale)

console.log(`In LIVE Clerk, id already correct : ${present.length - stale.length}`)
console.log(`In LIVE Clerk, but STALE clerk_user_id in Supabase : ${stale.length}`)
console.log(`MISSING from LIVE Clerk (cannot log in) : ${missing.length}\n`)

for (const u of missing) console.log(`  MISSING  ${u.role.padEnd(18)} ${u.email}`)
for (const u of stale) console.log(`  STALE ID ${u.role.padEnd(18)} ${u.email}  ${u.clerk_user_id} -> ${u.liveClerkId}`)

if (!FIX) {
  console.log('\nRe-run with --fix to create the MISSING users in the LIVE instance and repair STALE ids.')
  process.exit(0)
}

// --- FIX ---
for (const u of stale) {
  await patchSupabaseUser(u.id, { clerk_user_id: u.liveClerkId })
  console.log(`  repaired id  ${u.email}`)
}

if (STALE_ONLY) {
  console.log(
    `\nStale-only mode: repointed ${stale.length} id(s); skipped creating ${missing.length} MISSING user(s).` +
      '\nRe-run with --fix (without --stale-only) to create the MISSING users in LIVE Clerk.'
  )
  process.exit(0)
}

for (const u of missing) {
  const [firstName, ...rest] = (u.full_name || u.email).split(' ')
  const res = await clerk('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [u.email],
      password: tempPassword(),
      first_name: firstName,
      last_name: rest.join(' ') || '',
      public_metadata: { role: u.role },
      skip_password_checks: true,
    }),
  })
  if (!res.ok) {
    console.error(`  ! create failed ${u.email}: ${await res.text()}`)
    continue
  }
  const created = await res.json()
  await patchSupabaseUser(u.id, { clerk_user_id: created.id })
  console.log(`  created      ${u.email}  -> ${created.id}`)
}

console.log('\nDone. Users must set a password via "Forgot Password" in the app before signing in.')
