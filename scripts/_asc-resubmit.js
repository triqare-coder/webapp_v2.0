#!/usr/bin/env node
/*
 * Resubmit an App Store version that a PREVIOUS REJECTION still owns.
 *
 * A rejected review submission sits in UNRESOLVED_ISSUES and keeps holding the
 * version as a REJECTED item. While it does, POST /v1/reviewSubmissionItems for
 * that version 409s, and the fresh submission is then submitted empty and fails
 * with "does not have any items" — which reads like a permissions problem and is
 * not one. _asc-submit-version.js treats that 409 as "already on the submission",
 * so it cannot get past this state.
 *
 * The order that works: cancel the stuck submission, wait for it to leave
 * CANCELING (asynchronous, seconds), open a new one, add the version, verify the
 * item actually landed, then submit.
 *
 *   DRY_RUN=1 node scripts/_asc-resubmit.js    # report only, change nothing
 *   node scripts/_asc-resubmit.js              # cancel + submit for review
 */
const fs = require('fs')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'
const DRY_RUN = process.env.DRY_RUN === '1'

const now = Math.floor(Date.now() / 1000)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const signingInput = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({ iss: ISSUER, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' })}`
const TOKEN = `${signingInput}.${crypto
  .sign('sha256', Buffer.from(signingInput), { key: fs.readFileSync(KEY_PATH), dsaEncoding: 'ieee-p1363' })
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
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))

;(async () => {
  // 1. The version we intend to submit — the one that is not already on sale.
  const versions = await api(`/v1/apps/${APP_ID}/appStoreVersions?limit=10&include=build`)
  if (versions.status !== 200) return console.log(`✗ cannot read versions (${versions.status}):\n    ${errs(versions)}`)
  const version = versions.body.data.find((v) => v.attributes.appStoreState !== 'READY_FOR_SALE')
  if (!version) return console.log('• nothing to submit — every version is already on sale')
  const buildId = version.relationships?.build?.data?.id
  const build = (versions.body.included || []).find((i) => i.id === buildId)
  console.log(
    `version ${version.attributes.versionString} — ${version.attributes.appStoreState}, ` +
      `releaseType=${version.attributes.releaseType}, build=${build?.attributes?.version ?? 'NONE ATTACHED'}`
  )
  if (!buildId) return console.log('✗ no build attached — attach one before submitting')

  // 2. Anything still holding this version has to let go of it first.
  const subs = await api(`/v1/apps/${APP_ID}/reviewSubmissions?limit=20`)
  const blocking = []
  for (const s of subs.body?.data || []) {
    if (['COMPLETE', 'CANCELING'].includes(s.attributes.state)) continue
    // The item's own payload carries no relationships — the version only shows
    // up under `included`, so ask for it explicitly.
    const items = await api(`/v1/reviewSubmissions/${s.id}/items?include=appStoreVersion`)
    const holdsIt = (items.body?.included || []).some((i) => i.id === version.id)
    console.log(`  submission ${s.id} ${s.attributes.state} — ${holdsIt ? 'HOLDS this version' : 'unrelated'}`)
    if (holdsIt) blocking.push(s.id)
  }

  if (DRY_RUN) return console.log(`\nDRY_RUN=1 — would cancel ${blocking.length} submission(s), then submit.`)

  for (const id of blocking) {
    const cancel = await api(`/v1/reviewSubmissions/${id}`, 'PATCH', {
      data: { type: 'reviewSubmissions', id, attributes: { canceled: true } },
    })
    if (cancel.status !== 200) return console.log(`✗ cancelling ${id} failed (${cancel.status}):\n    ${errs(cancel)}`)
    console.log(`✓ cancelled ${id} — now ${cancel.body.data.attributes.state}`)
    // CANCELING clears asynchronously; the version stays held until it does.
    for (let i = 0; i < 20; i++) {
      const s = await api(`/v1/reviewSubmissions/${id}`)
      if (s.body?.data?.attributes?.state !== 'CANCELING') break
      await sleep(3000)
    }
  }

  // 3. A fresh submission, so nothing inherits the rejected item.
  const rs = await api('/v1/reviewSubmissions', 'POST', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  })
  if (rs.status !== 201) return console.log(`✗ creating the submission failed (${rs.status}):\n    ${errs(rs)}`)
  const submissionId = rs.body.data.id
  console.log(`✓ submission created — ${submissionId}`)

  const item = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
      },
    },
  })
  if (item.status !== 201) return console.log(`✗ adding the version failed (${item.status}):\n    ${errs(item)}`)

  // Submitting an empty submission is the failure this script exists to avoid.
  const check = await api(`/v1/reviewSubmissions/${submissionId}/items`)
  const count = (check.body?.data || []).length
  if (count === 0) return console.log('✗ the submission has no items — something still holds the version')
  console.log(`✓ version added (${count} item)`)

  const sent = await api(`/v1/reviewSubmissions/${submissionId}`, 'PATCH', {
    data: { type: 'reviewSubmissions', id: submissionId, attributes: { submitted: true } },
  })
  if (sent.status !== 200) return console.log(`✗ submitting failed (${sent.status}):\n    ${errs(sent)}`)
  console.log(`✓ SUBMITTED FOR REVIEW — ${sent.body?.data?.attributes?.state}`)
})().catch((e) => console.error('FATAL', e.message))
