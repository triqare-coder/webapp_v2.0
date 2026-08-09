#!/usr/bin/env node
/*
 * READ-ONLY: the privacy policy URL on the Play listing, and whether it answers.
 *
 * Play requires one too. If Play's URL is live, it is the obvious thing to point
 * App Store Connect at — the fastest legitimate fix for the 1.5 rejection.
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
  const call = async (p, method = 'GET') => {
    const r = await fetch(`${BASE}${p}`, { method, headers: { Authorization: `Bearer ${token}` } })
    const t = await r.text()
    try { return { status: r.status, body: t ? JSON.parse(t) : null } } catch { return { status: r.status, body: t } }
  }

  const edit = await call('/edits', 'POST')
  if (edit.status !== 200) return console.log('edits.insert failed', edit.status, JSON.stringify(edit.body).slice(0, 300))
  const id = edit.body.id
  try {
    const details = await call(`/edits/${id}/details`)
    console.log('=== LISTING DETAILS ===')
    console.log(JSON.stringify(details.body, null, 1))

    const listings = await call(`/edits/${id}/listings`)
    for (const l of listings.body?.listings || []) {
      console.log(`\n--- listing ${l.language} ---`)
      console.log(' title   :', l.title)
      console.log(' website :', l.website || '(none)')
    }

    const url = details.body?.contactWebsite
    if (url) {
      try {
        const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
        console.log(`\ncontactWebsite ${url} → ${r.status} ${r.url}`)
      } catch (e) {
        console.log(`\ncontactWebsite ${url} → FETCH FAILED ${e.message}`)
      }
    }
  } finally {
    await call(`/edits/${id}`, 'DELETE')
    console.log('\nedit discarded (nothing changed)')
  }
})().catch((e) => console.error('FATAL', e.message))
