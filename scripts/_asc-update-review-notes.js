#!/usr/bin/env node
/*
 * Put the WORKING demo credentials into the App Review notes.
 *
 * The notes still name dev.nujoom@gmail.com, which does not authenticate — fix
 * Guideline 1.5 without fixing this and the next reviewer simply fails at the
 * sign-in screen instead, which is Guideline 2.1.
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const VERSION_ID = process.env.VERSION_ID || 'a94e39a5-c95b-4f58-8871-ea39d206ec8d'

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'appreview@triqare.com'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'AppReview@2026'

const NOTES = `QSoS dispatches ambulances in India.

SIGNING IN
Use the demo account below. It is a patient account with a complete profile, one
emergency contact and both hospitals set, so the SOS button is enabled.

TESTING THE SOS BUTTON
The Emergency Trigger is only enabled for devices physically located in India,
because that is where the service operates. Outside India the button is disabled
and the app shows "Available only in India" — this is intended behaviour, not a
defect. To exercise it from elsewhere, please simulate a location in India
(Xcode/Simulator: Debug > Simulate Location, or Settings > Developer). A useful
coordinate is Bengaluru 12.9716, 77.5946.

Pressing SOS creates a real dispatch request in our system; it can be cancelled
from the same screen straight afterwards.

The app also requires location permission (to send an ambulance to the user) and
notification permission (to alert the user and their emergency contacts).`

const now = Math.floor(Date.now() / 1000)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const input = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({ iss: ISSUER, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`
const TOKEN = `${input}.${crypto
  .sign('sha256', Buffer.from(input), { key: fs.readFileSync(KEY_PATH), dsaEncoding: 'ieee-p1363' })
  .toString('base64url')}`

const api = async (path, method = 'GET', body) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const t = await r.text()
  let parsed
  try { parsed = t ? JSON.parse(t) : null } catch { parsed = t }
  return { status: r.status, body: parsed }
}

;(async () => {
  const ver = await api(`/v1/appStoreVersions/${VERSION_ID}?include=appStoreReviewDetail`)
  const detail = (ver.body?.included || []).find((i) => i.type === 'appStoreReviewDetails')
  if (!detail) return console.log('✗ no appStoreReviewDetail on this version')

  console.log('before:', JSON.stringify({
    demoAccountName: detail.attributes.demoAccountName,
    demoAccountRequired: detail.attributes.demoAccountRequired,
  }))

  const res = await api(`/v1/appStoreReviewDetails/${detail.id}`, 'PATCH', {
    data: {
      type: 'appStoreReviewDetails',
      id: detail.id,
      attributes: {
        demoAccountName: DEMO_EMAIL,
        demoAccountPassword: DEMO_PASSWORD,
        demoAccountRequired: true,
        notes: NOTES,
      },
    },
  })
  console.log(
    res.status === 200
      ? `✓ review notes updated — demo account now ${res.body.data.attributes.demoAccountName}`
      : `✗ update failed (${res.status}): ${JSON.stringify(res.body).slice(0, 400)}`
  )
})().catch((e) => console.error('FATAL', e.message))
