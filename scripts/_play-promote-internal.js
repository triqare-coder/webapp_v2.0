#!/usr/bin/env node
/*
 * Promote the internal-track DRAFT to a rolled-out release.
 *
 * eas submit parked versionCode 49 as a draft, and a draft reaches nobody until
 * someone rolls it out. Play rejects re-submitting the same version code, so the
 * only way forward for THIS build is to flip the existing release's status.
 *
 * Writes: it commits a Play edit. Everything it does is scoped to the internal
 * track. Run with VERSION_CODE=<n>.
 */
const { JWT } = require('/Users/rahul/Triqare/web-production/node_modules/google-auth-library')

const KEY = require('/Users/rahul/Triqare/Triqare-app/credentials/android/play-service-account.json')
const PKG = 'com.sosapp.emergency'
const TRACK = 'internal'
const VERSION_CODE = process.env.VERSION_CODE || '49'
const NAME = process.env.RELEASE_NAME || `${VERSION_CODE} (2.0.2)`
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`

;(async () => {
  const client = new JWT({
    email: KEY.client_email,
    key: KEY.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })
  const { token } = await client.getAccessToken()
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const text = await r.text()
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = text }
    return { status: r.status, body: parsed }
  }

  const edit = await call('/edits', 'POST')
  if (edit.status !== 200) {
    return console.log('edits.insert failed:', edit.status, JSON.stringify(edit.body).slice(0, 400))
  }
  const id = edit.body.id

  const update = await call(`/edits/${id}/tracks/${TRACK}`, 'PUT', {
    track: TRACK,
    releases: [{ name: NAME, versionCodes: [String(VERSION_CODE)], status: 'completed' }],
  })
  console.log('tracks.update ->', update.status, JSON.stringify(update.body).slice(0, 400))
  if (update.status !== 200) {
    await call(`/edits/${id}`, 'DELETE')
    return console.log('edit discarded; nothing changed')
  }

  const commit = await call(`/edits/${id}:commit`, 'POST')
  console.log('commit ->', commit.status, JSON.stringify(commit.body).slice(0, 300))
})().catch((e) => console.error('FATAL', e.message))
