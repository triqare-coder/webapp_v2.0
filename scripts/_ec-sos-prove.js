#!/usr/bin/env node
/*
 * Prove the emergency-contact SOS path end to end, then remove the evidence.
 *
 * This WRITES: it calls the real RPC, which inserts a real sos_requests row —
 * the only way to exercise the INSERT that was failing (the auth check refuses
 * before reaching it for any fake patient). Blast radius, checked first:
 *   • the pair is a test patient (betaqsos@gmail.com) and a test contact
 *   • the patient's stored coordinates are in the UK, so proximity dispatch in
 *     India matches no driver
 *   • the row is deleted immediately, in a finally block
 *
 * Cleanup is unconditional: if the read or the assertions throw, the row still
 * goes. Anything it cannot delete is printed loudly so it can be removed by hand.
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

const PATIENT = '87275b6d-8344-4462-88f1-139b2802d542' // betaqsos@gmail.com
const CONTACT = '5dfbe755-7651-4c58-86dc-06a7adf4df24' // jerritrios@gmail.com

;(async () => {
  console.log('→ calling create_sos_by_emergency_contact …')
  const { data: newId, error } = await sb.rpc('create_sos_by_emergency_contact', {
    p_patient_id: PATIENT,
    p_contact_user_id: CONTACT,
  })

  if (error) {
    console.log(`✗ STILL FAILING — code=${error.code} message=${error.message}`)
    console.log(`  details=${error.details || '-'} hint=${error.hint || '-'}`)
    return
  }
  console.log(`✓ RPC returned request id ${newId}`)

  try {
    const { data: row } = await sb
      .from('sos_requests')
      .select('id,patient_id,patient_name,patient_phone,status,location_lat,location_lon,triggered_by,triggered_by_user_id,status_history,expires_at')
      .eq('id', newId)
      .maybeSingle()

    if (!row) {
      console.log('✗ RPC returned an id but no row is readable')
      return
    }
    console.log('\n=== THE ROW ===')
    console.log(` status         ${row.status}`)
    console.log(` patient        ${row.patient_name} / ${row.patient_phone}`)
    console.log(` location       ${row.location_lat}, ${row.location_lon}`)
    console.log(` triggered_by   ${row.triggered_by} by user ${row.triggered_by_user_id}`)
    console.log(` expires_at     ${row.expires_at}`)
    console.log(` status_history typeof=${typeof row.status_history}`)
    console.log(` ${JSON.stringify(row.status_history)}`)

    // The shape check that matters: every reader parses this as a JSON string,
    // so a native array here would break history rendering everywhere.
    const parsed = typeof row.status_history === 'string' ? JSON.parse(row.status_history) : row.status_history
    const entry = Array.isArray(parsed) ? parsed[0] : null
    console.log(
      `\n shape: ${typeof row.status_history === 'string' ? '✓ JSON string (matches patient-created rows)' : '✗ NOT a string — readers expect one'}`
    )
    console.log(` actor=${entry?.actor} location_source=${entry?.location_source}`)
  } finally {
    const { error: delErr } = await sb.from('sos_requests').delete().eq('id', newId)
    console.log(
      delErr
        ? `\n✗✗ CLEANUP FAILED — delete sos_requests ${newId} BY HAND: ${delErr.code} ${delErr.message}`
        : `\n✓ cleaned up — test row ${newId} deleted`
    )
  }
})()
