#!/usr/bin/env node
/*
 * Put the WORKING demo credentials into the App Review notes.
 *
 * The notes still name dev.nujoom@gmail.com, which does not authenticate — fix
 * Guideline 1.5 without fixing this and the next reviewer simply fails at the
 * sign-in screen instead, which is Guideline 2.1.
 *
 * 2026-08-11 rejection: the notes now also tell the reviewer where to check the
 * two things they raised — the Sign in with Apple name (Guideline 4, fixed in
 * build 11) and tracking (Guideline 5.1.2(i), a privacy-label correction with no
 * code in it). App Review asks for the location of a fix in the notes, and the
 * SIWA one is invisible unless you know to sign in with a fresh Apple ID.
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
notification permission (to alert the user and their emergency contacts).

SIGN IN WITH APPLE (Guideline 4, fixed in this build)
The name returned by Sign in with Apple was received but not read by the profile
setup screen, so it appeared blank and had to be typed again. This build
pre-fills it from the Sign in with Apple credential, and backfills accounts
created before the fix. To verify: Sign In > "Apple" > complete Sign in with
Apple with an Apple ID that has not used this app before > the setup wizard's
"Full name" field is already filled in with the name from that Apple ID. The
email address is not requested at any point after Sign in with Apple.

TRACKING (Guideline 5.1.2(i)) — WE ARE BLOCKED FROM CORRECTING THE LABELS
This app does not track users, on any platform. It contains no advertising,
attribution or analytics SDK, does not access the IDFA, does not link collected
data with third-party data for advertising, and shares nothing with data
brokers. Firebase is used only to deliver emergency push notifications. No App
Tracking Transparency prompt is presented, because none is required.

The App Privacy answers are wrong, we know they are wrong, and we have been
unable to correct them. Every attempt to save "not used for tracking" is refused
by App Store Connect with:

  "Your app contains NSUserTrackingUsageDescription, indicating that it may
   request permission to track users. To submit for review, update your App
   Privacy response to indicate that data collected from this app will be used
   for tracking purposes, or update your app binary and upload a new build."

The binary submitted here does NOT contain that key. Verified on the uploaded
build 18 IPA: zero occurrences of NSUserTrackingUsageDescription anywhere in the
.app; neither AppTrackingTransparency nor AdSupport linked (otool -L); and all
21 bundled privacy manifests declare NSPrivacyTracking = false. Builds 3-11 and
17 are the same. The only binaries that ever carried the key were the April/May
ones, and all of them are now expired — including build 16, which is the binary
of the LIVE 2.0.0 version and, we believe, what that check is still reading.

That leaves us unable to proceed: we cannot correct the labels while 2.0.0 is
the live version, and 2.0.0 cannot be replaced until this build is approved. We
have uploaded five clean builds trying to clear it, which is the other remedy
the message offers.

We are asking you to review this build on its merits. The moment it replaces
2.0.0 we will publish corrected App Privacy answers declaring no data used to
track. If you would rather we resolve it first, please tell us how to clear the
check, or clear it on your side, and we will publish the corrected answers
immediately.`

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
