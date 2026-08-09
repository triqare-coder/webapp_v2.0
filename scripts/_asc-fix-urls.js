#!/usr/bin/env node
/*
 * Repoint the App Store listing at URLs that answer, then re-submit for review.
 *
 * Guideline 1.5 rejected 2.0.2 because privacyPolicyUrl, supportUrl and
 * marketingUrl all pointed at www.triqare.in, which no longer resolves.
 *
 * marketingUrl is CLEARED rather than repointed: it is optional, and every URL
 * on the listing is one more thing that can be dead at review time. Better to
 * have none than a second one to keep alive.
 *
 * Run with SUBMIT=1 to also re-submit for review once the URLs are fixed.
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'

const PRIVACY_URL = process.env.PRIVACY_URL || 'https://portal.triqare.com/privacy-policy'
const SUPPORT_URL = process.env.SUPPORT_URL || 'https://portal.triqare.com/support'
const SUBMIT = process.env.SUBMIT === '1'

const now = Math.floor(Date.now() / 1000)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const input = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({ iss: ISSUER, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' })}`
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
  // Privacy policy lives on appInfoLocalizations -------------------------------
  const infos = await api(`/v1/apps/${APP_ID}/appInfos?limit=5`)
  for (const info of infos.body?.data || []) {
    const state = info.attributes?.appStoreState
    const locs = await api(`/v1/appInfos/${info.id}/appInfoLocalizations?fields[appInfoLocalizations]=locale,privacyPolicyUrl`)
    for (const l of locs.body?.data || []) {
      const res = await api(`/v1/appInfoLocalizations/${l.id}`, 'PATCH', {
        data: {
          type: 'appInfoLocalizations',
          id: l.id,
          attributes: { privacyPolicyUrl: PRIVACY_URL },
        },
      })
      console.log(
        res.status === 200
          ? `✓ privacyPolicyUrl set (${l.attributes.locale}, appInfo ${state})`
          : `• privacyPolicyUrl NOT changed (${l.attributes.locale}, appInfo ${state}) — ${res.status}\n    ${errs(res)}`
      )
    }
  }

  // Support / marketing live on appStoreVersionLocalizations -------------------
  const versions = await api(`/v1/apps/${APP_ID}/appStoreVersions?limit=3&fields[appStoreVersions]=versionString,appStoreState`)
  let editableVersionId = null
  for (const v of versions.body?.data || []) {
    const st = v.attributes.appStoreState
    const locs = await api(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,supportUrl,marketingUrl`)
    for (const l of locs.body?.data || []) {
      const res = await api(`/v1/appStoreVersionLocalizations/${l.id}`, 'PATCH', {
        data: {
          type: 'appStoreVersionLocalizations',
          id: l.id,
          attributes: { supportUrl: SUPPORT_URL, marketingUrl: null },
        },
      })
      if (res.status === 200) {
        console.log(`✓ supportUrl set + marketingUrl cleared (${v.attributes.versionString}, ${st})`)
        if (st !== 'READY_FOR_SALE') editableVersionId = v.id
      } else {
        console.log(`• version ${v.attributes.versionString} (${st}) not editable — ${res.status}\n    ${errs(res)}`)
      }
    }
  }

  if (!SUBMIT) return console.log('\nSUBMIT=1 to re-submit for review.')
  if (!editableVersionId) return console.log('\nNo editable version to submit.')

  const rs = await api('/v1/reviewSubmissions', 'POST', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  })
  if (rs.status !== 201) return console.log(`✗ could not open a review submission (${rs.status}):\n    ${errs(rs)}`)
  const subId = rs.body.data.id

  const item = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: editableVersionId } },
      },
    },
  })
  if (item.status !== 201) return console.log(`✗ could not add the version (${item.status}):\n    ${errs(item)}`)

  const sent = await api(`/v1/reviewSubmissions/${subId}`, 'PATCH', {
    data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } },
  })
  console.log(
    sent.status === 200
      ? `✓ RE-SUBMITTED — state ${sent.body?.data?.attributes?.state}`
      : `✗ submit failed (${sent.status}):\n    ${errs(sent)}`
  )
})().catch((e) => console.error('FATAL', e.message))
