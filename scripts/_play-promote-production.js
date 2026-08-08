#!/usr/bin/env node
/*
 * Promote a build to the PRODUCTION track as a staged rollout.
 *
 * Both releases are sent deliberately: the in-progress one (the new build, at
 * userFraction) and the previously completed one. That pair is how Play models a
 * staged rollout — the fraction gets the new build, everyone else stays on the
 * old one. Sending only the new release would leave the remainder undefined.
 *
 *   VERSION_CODE=49 PREVIOUS_CODE=39 USER_FRACTION=0.2 node scripts/_play-promote-production.js
 *
 * Halting later is a one-liner in Play Console (or set USER_FRACTION back down).
 */
const { JWT } = require('/Users/rahul/Triqare/web-production/node_modules/google-auth-library')

const KEY = require('/Users/rahul/Triqare/Triqare-app/credentials/android/play-service-account.json')
const PKG = 'com.sosapp.emergency'
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`

const VERSION_CODE = process.env.VERSION_CODE || '49'
const PREVIOUS_CODE = process.env.PREVIOUS_CODE || '39'
const USER_FRACTION = Number(process.env.USER_FRACTION || '0.2')

const RELEASE_NOTES = `• Emergency contacts can now raise an SOS for the patient they are linked to.
• The SOS button no longer stays active abroad while your location is still being worked out.
• When no ambulance can be assigned, the app now says so plainly and offers a one-tap call to 108, instead of reporting it as a cancellation.`

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

  const update = await call(`/edits/${id}/tracks/production`, 'PUT', {
    track: 'production',
    releases: [
      { versionCodes: [String(PREVIOUS_CODE)], status: 'completed' },
      {
        name: `${VERSION_CODE} (2.0.2)`,
        versionCodes: [String(VERSION_CODE)],
        status: 'inProgress',
        userFraction: USER_FRACTION,
        releaseNotes: [{ language: 'en-US', text: RELEASE_NOTES }],
      },
    ],
  })
  console.log('tracks.update ->', update.status, JSON.stringify(update.body).slice(0, 600))
  if (update.status !== 200) {
    await call(`/edits/${id}`, 'DELETE')
    return console.log('edit discarded; production unchanged')
  }

  const commit = await call(`/edits/${id}:commit`, 'POST')
  console.log('commit ->', commit.status, JSON.stringify(commit.body).slice(0, 300))
})().catch((e) => console.error('FATAL', e.message))
