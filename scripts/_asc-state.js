#!/usr/bin/env node
/*
 * READ-ONLY: what does App Store Connect think the current state is?
 *
 * eas submit uploads a build; it does NOT create an App Store version or submit
 * anything for review. This shows which versions exist, their state, and whether
 * build 6 has finished Apple's processing (it cannot be attached until it has).
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'

function token() {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' }
  const payload = { iss: ISSUER, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const signingInput = `${b64(header)}.${b64(payload)}`
  const sig = crypto.sign('sha256', Buffer.from(signingInput), {
    key: fs.readFileSync(KEY_PATH),
    dsaEncoding: 'ieee-p1363',
  })
  return `${signingInput}.${sig.toString('base64url')}`
}

const JWT = token()
const get = async (path) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${JWT}` },
  })
  const text = await r.text()
  try { return { status: r.status, body: JSON.parse(text) } } catch { return { status: r.status, body: text } }
}

;(async () => {
  const app = await get(`/v1/apps/${APP_ID}`)
  console.log('app:', app.status, app.body?.data?.attributes?.name, app.body?.data?.attributes?.bundleId)

  const versions = await get(
    `/v1/apps/${APP_ID}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate,releaseType`
  )
  console.log('\n=== APP STORE VERSIONS ===')
  for (const v of versions.body?.data || []) {
    const a = v.attributes
    console.log(` ${a.versionString.padEnd(8)} state=${a.appStoreState} releaseType=${a.releaseType} id=${v.id}`)
  }
  if (versions.status !== 200) console.log(JSON.stringify(versions.body).slice(0, 400))

  const builds = await get(
    `/v1/builds?filter[app]=${APP_ID}&limit=5&sort=-uploadedDate&fields[builds]=version,processingState,expired,uploadedDate`
  )
  console.log('\n=== BUILDS ===')
  for (const b of builds.body?.data || []) {
    const a = b.attributes
    console.log(` build ${String(a.version).padEnd(4)} ${a.processingState} expired=${a.expired} ${a.uploadedDate} id=${b.id}`)
  }
})().catch((e) => console.error('FATAL', e.message))
