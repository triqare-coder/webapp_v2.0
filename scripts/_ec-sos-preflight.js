#!/usr/bin/env node
/*
 * READ-ONLY preflight before firing one real EC-raised SOS to prove the fix.
 *
 * The concern is blast radius: an insert into sos_requests can reach live
 * drivers (realtime subscription in the driver app, and the pg_net push trigger
 * that POSTs the dispatch route). So: who is actually on duty right now, and
 * what does the dispatch side do with a request sitting in the UK?
 */
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const env = {}
for (const line of fs.readFileSync('.env.netlify', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

;(async () => {
  const { data: drivers, error } = await sb
    .from('drivers')
    .select('user_id,status,is_available,updated_at')
    .limit(50)
  if (error) console.log('drivers ERR', error.code, error.message)
  else {
    const onDuty = drivers.filter(
      (d) => d.is_available === true || ['available', 'active', 'assigned', 'on_trip'].includes(String(d.status))
    )
    console.log(`drivers: ${drivers.length} total, ${onDuty.length} on duty`)
    onDuty.forEach((d) =>
      console.log(`  ${d.user_id} status=${d.status} available=${d.is_available} updated=${d.updated_at}`)
    )
  }

  const { data: tokens } = await sb
    .from('device_tokens')
    .select('user_id,role,platform,is_active,updated_at')
    .eq('role', 'driver')
    .eq('is_active', true)
  console.log(`\nactive driver push tokens: ${tokens ? tokens.length : 'n/a'}`)

  const { data: recentPush } = await sb
    .from('push_deliveries')
    .select('event,audience,recipients,sent,created_at')
    .order('created_at', { ascending: false })
    .limit(3)
  console.log('\nlast push deliveries:')
  console.log(JSON.stringify(recentPush, null, 1))
})()
