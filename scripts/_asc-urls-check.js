#!/usr/bin/env node
/*
 * READ-ONLY: the Support / Privacy / Marketing URLs App Store Connect holds,
 * and whether each one actually answers.
 *
 * Guideline 1.5 rejects on a URL that errors — including one that fails only
 * over HTTPS, or only without a www, which is invisible if you test by clicking
 * a link in a browser that silently corrects it. So each is fetched exactly as
 * stored, following redirects, and the final URL and status are reported.
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'

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

async function probe(label, url) {
  if (!url) return console.log(` ${label.padEnd(16)} (not set)`)
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
    const body = await r.text()
    const finalUrl = r.url !== url ? `  → ${r.url}` : ''
    const verdict = r.ok ? '✓' : '✗'
    console.log(` ${label.padEnd(16)} ${verdict} ${r.status} ${url}${finalUrl}  [${body.length} bytes]`)
  } catch (e) {
    console.log(` ${label.padEnd(16)} ✗ FETCH FAILED ${url}\n      ${e.message} (${e.cause?.code || 'no code'})`)
  }
}

;(async () => {
  const infos = await get(`/v1/apps/${APP_ID}/appInfos?limit=5`)
  for (const info of infos.body?.data || []) {
    const locs = await get(
      `/v1/appInfos/${info.id}/appInfoLocalizations?fields[appInfoLocalizations]=locale,privacyPolicyUrl,privacyChoicesUrl`
    )
    for (const l of locs.body?.data || []) {
      console.log(`\n=== appInfo ${info.id} / ${l.attributes.locale} (state: ${info.attributes?.appStoreState}) ===`)
      await probe('privacyPolicy', l.attributes.privacyPolicyUrl)
      await probe('privacyChoices', l.attributes.privacyChoicesUrl)
    }
  }

  const versions = await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=3&fields[appStoreVersions]=versionString,appStoreState`)
  for (const v of versions.body?.data || []) {
    const locs = await get(
      `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,supportUrl,marketingUrl`
    )
    for (const l of locs.body?.data || []) {
      console.log(`\n=== version ${v.attributes.versionString} (${v.attributes.appStoreState}) / ${l.attributes.locale} ===`)
      await probe('supportUrl', l.attributes.supportUrl)
      await probe('marketingUrl', l.attributes.marketingUrl)
    }
  }
})().catch((e) => console.error('FATAL', e.message))
