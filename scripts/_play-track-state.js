#!/usr/bin/env node
/*
 * READ-ONLY: what is actually in the Play internal track right now?
 *
 * Play Console's "this release does not add or remove any app bundles" means the
 * release it is showing has no bundle attached. This opens a throwaway edit,
 * reads the tracks and the uploaded bundle list, and DELETES the edit without
 * committing, so nothing about the app changes.
 */
const { JWT } = require('/Users/rahul/Triqare/web-production/node_modules/google-auth-library')

const KEY = require('/Users/rahul/Triqare/Triqare-app/credentials/android/play-service-account.json')
const PKG = 'com.sosapp.emergency'
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`

;(async () => {
  const client = new JWT({
    email: KEY.client_email,
    key: KEY.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })
  const { token } = await client.getAccessToken()
  const call = async (path, method = 'GET') => {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    })
    const text = await r.text()
    let body
    try { body = JSON.parse(text) } catch { body = text }
    return { status: r.status, body }
  }

  const edit = await call('/edits', 'POST')
  if (edit.status !== 200) {
    console.log('edits.insert failed:', edit.status, JSON.stringify(edit.body).slice(0, 500))
    return
  }
  const id = edit.body.id
  console.log('edit', id)

  try {
    const tracks = await call(`/edits/${id}/tracks`)
    console.log('\n=== TRACKS ===')
    for (const t of tracks.body.tracks || []) {
      console.log(`\ntrack: ${t.track}`)
      for (const r of t.releases || []) {
        console.log(
          `  release "${r.name || '(unnamed)'}" status=${r.status} ` +
            `versionCodes=${JSON.stringify(r.versionCodes || null)} ` +
            `userFraction=${r.userFraction ?? '-'}`
        )
      }
    }

    const bundles = await call(`/edits/${id}/bundles`)
    console.log('\n=== UPLOADED BUNDLES ===')
    console.log(
      (bundles.body.bundles || []).map((b) => b.versionCode).sort((a, b) => a - b).join(', ') ||
        JSON.stringify(bundles.body).slice(0, 300)
    )
  } finally {
    const del = await call(`/edits/${id}`, 'DELETE')
    console.log('\nedit discarded:', del.status === 204 ? 'ok (nothing changed)' : del.status)
  }
})().catch((e) => console.error('FATAL', e.message))
