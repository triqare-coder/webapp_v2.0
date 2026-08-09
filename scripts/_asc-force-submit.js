#!/usr/bin/env node
/*
 * Submit the current version for review, recovering from a half-built submission.
 *
 * A reviewSubmission can sit in READY_FOR_REVIEW with NO items — that is what a
 * 409 on reviewSubmissionItems leaves behind, and PATCHing submitted:true then
 * fails with "does not have any items". Treating that 409 as "already added" (as
 * the earlier script did) hides the problem.
 *
 * So: inspect the open submission, delete it if it is empty, build a fresh one,
 * and only then submit.
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'
const VERSION_ID = process.env.VERSION_ID || 'a94e39a5-c95b-4f58-8871-ea39d206ec8d'

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
  (r.body?.errors || []).map((e) => `${e.code}: ${e.title} — ${e.detail || ''}`).join('\n    ') ||
  JSON.stringify(r.body).slice(0, 400)

;(async () => {
  const open = await api(
    `/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW&fields[reviewSubmissions]=state`
  )
  for (const s of open.body?.data || []) {
    const items = await api(`/v1/reviewSubmissions/${s.id}/items?fields[reviewSubmissionItems]=state`)
    const count = items.body?.data?.length || 0
    console.log(`open submission ${s.id} state=${s.attributes.state} items=${count}`)
    if (count === 0 && s.attributes.state === 'READY_FOR_REVIEW') {
      const del = await api(`/v1/reviewSubmissions/${s.id}`, 'DELETE')
      console.log(`  ${del.status === 204 ? '✓ deleted the empty submission' : `✗ delete failed ${del.status}: ${errs(del)}`}`)
    }
  }

  const rs = await api('/v1/reviewSubmissions', 'POST', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  })
  if (rs.status !== 201) return console.log(`✗ create submission failed (${rs.status}):\n    ${errs(rs)}`)
  const subId = rs.body.data.id
  console.log(`✓ fresh submission ${subId}`)

  const item = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
      },
    },
  })
  if (item.status !== 201) return console.log(`✗ add item failed (${item.status}):\n    ${errs(item)}`)
  console.log('✓ version added as an item')

  const sent = await api(`/v1/reviewSubmissions/${subId}`, 'PATCH', {
    data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } },
  })
  console.log(
    sent.status === 200
      ? `✓ SUBMITTED — state ${sent.body?.data?.attributes?.state}`
      : `✗ submit failed (${sent.status}):\n    ${errs(sent)}`
  )
})().catch((e) => console.error('FATAL', e.message))
