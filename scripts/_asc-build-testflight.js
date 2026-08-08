#!/usr/bin/env node
/* READ-ONLY: why is a processed build not visible in TestFlight? */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'
const BUILD_ID = process.env.BUILD_ID || 'cbbf66b1-eeb7-4c96-ab72-5a8b3827f7c0' // build 6

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
  const b = await get(
    `/v1/builds/${BUILD_ID}?fields[builds]=version,processingState,expired,usesNonExemptEncryption&include=betaAppReviewSubmission,buildBetaDetail,betaGroups`
  )
  const a = b.body?.data?.attributes || {}
  console.log(`build ${a.version}: processing=${a.processingState} expired=${a.expired} usesNonExemptEncryption=${a.usesNonExemptEncryption}`)

  for (const inc of b.body?.included || []) {
    if (inc.type === 'buildBetaDetails') {
      console.log(
        `  internal testing: ${inc.attributes.internalBuildState}   external: ${inc.attributes.externalBuildState}   autoNotify=${inc.attributes.autoNotifyEnabled}`
      )
    }
    if (inc.type === 'betaGroups') {
      console.log(`  assigned group: ${inc.attributes.name} (internal=${inc.attributes.isInternalGroup})`)
    }
    if (inc.type === 'betaAppReviewSubmissions') {
      console.log(`  beta app review: ${inc.attributes.betaReviewState}`)
    }
  }

  const groups = await get(`/v1/apps/${APP_ID}/betaGroups?fields[betaGroups]=name,isInternalGroup,publicLinkEnabled&limit=20`)
  console.log('\nall beta groups on the app:')
  for (const g of groups.body?.data || []) {
    console.log(`  ${g.attributes.name} — internal=${g.attributes.isInternalGroup} id=${g.id}`)
  }
})().catch((e) => console.error('FATAL', e.message))
