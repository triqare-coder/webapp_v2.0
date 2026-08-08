#!/usr/bin/env node
/*
 * Put a processed build in front of the EXTERNAL TestFlight testers.
 *
 * A build that finishes processing is visible only to internal testers. External
 * groups need the build attached to the group AND a beta app review submission —
 * neither happens on its own, which is why testers sat on an older build while a
 * newer one existed.
 *
 *   BUILD_ID=... GROUP_ID=... node scripts/_asc-distribute-build.js
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'

const BUILD_ID = process.env.BUILD_ID || 'cbbf66b1-eeb7-4c96-ab72-5a8b3827f7c0' // build 6
const GROUP_ID = process.env.GROUP_ID || 'b6eb154b-1d3b-4ee2-abca-e5a0c786573c' // "testers"

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
const errs = (r) =>
  (r.body?.errors || []).map((e) => `${e.status} ${e.code}: ${e.title} — ${e.detail || ''}`).join('\n    ') ||
  JSON.stringify(r.body).slice(0, 300)

;(async () => {
  const add = await api(`/v1/betaGroups/${GROUP_ID}/relationships/builds`, 'POST', {
    data: [{ type: 'builds', id: BUILD_ID }],
  })
  console.log(
    add.status === 204
      ? '✓ build attached to the external group'
      : `• attach returned ${add.status}:\n    ${errs(add)}`
  )

  const review = await api('/v1/betaAppReviewSubmissions', 'POST', {
    data: { type: 'betaAppReviewSubmissions', relationships: { build: { data: { type: 'builds', id: BUILD_ID } } } },
  })
  console.log(
    review.status === 201
      ? `✓ submitted for beta app review — state ${review.body?.data?.attributes?.betaReviewState}`
      : `• beta review returned ${review.status}:\n    ${errs(review)}`
  )

  const check = await api(
    `/v1/builds/${BUILD_ID}?include=buildBetaDetail,betaGroups&fields[builds]=version`
  )
  for (const inc of check.body?.included || []) {
    if (inc.type === 'buildBetaDetails')
      console.log(`\nnow: internal=${inc.attributes.internalBuildState} external=${inc.attributes.externalBuildState}`)
    if (inc.type === 'betaGroups') console.log(`  group: ${inc.attributes.name}`)
  }
})().catch((e) => console.error('FATAL', e.message))
