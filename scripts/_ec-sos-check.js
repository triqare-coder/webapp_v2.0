#!/usr/bin/env node
/* READ-ONLY: has the emergency-contact SOS path produced a row yet? */
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
  const { data, error } = await sb
    .from('sos_requests')
    .select('id,patient_id,status,requested_at,triggered_by,location_lat,location_lon,status_history')
    .eq('triggered_by', 'EMERGENCY_CONTACT')
    .order('requested_at', { ascending: false })
    .limit(5)
  if (error) return console.log('ERR', error.code, error.message)
  if (!data.length) return console.log('EC-triggered SOS rows: NONE YET (button still unproven on live)')
  console.log(`EC-triggered SOS rows: ${data.length}`)
  data.forEach((r) =>
    console.log(` ${r.requested_at} ${r.status.padEnd(20)} ${r.location_lat},${r.location_lon}  ${r.id}`)
  )
})()
