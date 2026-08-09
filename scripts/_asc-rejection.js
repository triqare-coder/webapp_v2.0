#!/usr/bin/env node
/* READ-ONLY: what did App Review actually say / which item was rejected? */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'
const VERSION_ID = process.env.VERSION_ID || 'a94e39a5-c95b-4f58-8871-ea39d206ec8d'

const now = Math.floor(Date.now() / 1000)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const input = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({ iss: ISSUER, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`
const TOKEN = `${input}.${crypto
  .sign('sha256', Buffer.from(input), { key: fs.readFileSync(KEY_PATH), dsaEncoding: 'ieee-p1363' })
  .toString('base64url')}`

const get = async (p) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const t = await r.text()
  try { return { status: r.status, body: t ? JSON.parse(t) : null } } catch { return { status: r.status, body: t } }
}

;(async () => {
  const subs = await get(
    `/v1/reviewSubmissions?filter[app]=${APP_ID}&limit=5&sort=-submittedDate&fields[reviewSubmissions]=state,submittedDate,platform`
  )
  console.log('=== REVIEW SUBMISSIONS ===')
  for (const s of subs.body?.data || []) {
    console.log(` ${s.attributes.state.padEnd(24)} submitted=${s.attributes.submittedDate} id=${s.id}`)
    const items = await get(
      `/v1/reviewSubmissions/${s.id}/items?include=appStoreVersion&fields[reviewSubmissionItems]=state,resolved`
    )
    for (const it of items.body?.data || []) {
      console.log(`   item state=${it.attributes.state} resolved=${it.attributes.resolved}`)
    }
  }

  const ver = await get(
    `/v1/appStoreVersions/${VERSION_ID}?include=build,appStoreReviewDetail&fields[appStoreVersions]=versionString,appStoreState,createdDate`
  )
  console.log('\n=== VERSION ===')
  console.log(' ', JSON.stringify(ver.body?.data?.attributes))
  for (const inc of ver.body?.included || []) {
    if (inc.type === 'builds') console.log('  attached build:', inc.attributes?.version)
    if (inc.type === 'appStoreReviewDetails') console.log('  review detail:', JSON.stringify(inc.attributes).slice(0, 400))
  }

  // Resolution Center messages are not exposed by the public API; say so rather
  // than leave the reader thinking the rejection reason was simply absent.
  console.log(
    '\nNote: Apple does not expose Resolution Center messages via the API — the reason text\n' +
      'is in App Store Connect → the 2.0.2 version page, and in the email Apple sent.'
  )
})().catch((e) => console.error('FATAL', e.message))
