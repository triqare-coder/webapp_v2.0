#!/usr/bin/env node
/*
 * Replace an App Store version's screenshots.
 *
 * App Review rejected 2.0.2 twice over these: the iPhone set were ANDROID captures
 * (2.3.10 — Android status bar and navigation bar in frame) and the 13-inch iPad set
 * showed April's pre-redesign UI (2.3.3). Adding a new set is not enough — the
 * offending ones have to go, or the rejection stands.
 *
 * Upload is three calls per image: reserve (POST appScreenshots) hands back
 * uploadOperations, each of which is a literal method/url/offset/length to PUT a slice
 * of the file to; then PATCH uploaded:true with the file's md5 so Apple can verify it.
 *
 *   DRY_RUN=1 node scripts/_asc-upload-screenshots.js   # show the plan, change nothing
 *   node scripts/_asc-upload-screenshots.js
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const KEY_ID = 'K752QH8TUP'
const ISSUER = '886b1827-ae88-46e7-a137-5a07b904c932'
const KEY_PATH = '/Users/rahul/.appstoreconnect/private_keys/AuthKey_K752QH8TUP.p8'
const APP_ID = '6762559111'
const DRY_RUN = process.env.DRY_RUN === '1'
const ROOT = process.env.SHOTS_DIR || '/Users/rahul/Triqare/ios-screenshots'

// Which local folder feeds which App Store display type, and which types to clear out.
const PLAN = [
  // 6.9" has no display type in the API — APP_IPHONE_67 is the largest it offers,
  // and Apple scales it up for 6.9" devices. Captures are taken at 1320x2868 and
  // rescaled to 1290x2796, which is a 30px width scale and a 7px crop.
  { dir: 'iphone67', displayType: 'APP_IPHONE_67', replaces: ['APP_IPHONE_67', 'APP_IPHONE_65'] },
  { dir: 'ipad13', displayType: 'APP_IPAD_PRO_3GEN_129', replaces: ['APP_IPAD_PRO_3GEN_129'] },
]

const now = Math.floor(Date.now() / 1000)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const signingInput = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({ iss: ISSUER, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`
const TOKEN = `${signingInput}.${crypto
  .sign('sha256', Buffer.from(signingInput), { key: fs.readFileSync(KEY_PATH), dsaEncoding: 'ieee-p1363' })
  .toString('base64url')}`

const api = async (p, method = 'GET', body) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${p}`, {
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
  (r.body?.errors || []).map((e) => `${e.status} ${e.code}: ${e.title} — ${e.detail || ''}`).join('\n      ') ||
  JSON.stringify(r.body).slice(0, 300)

async function uploadOne(setId, file, index) {
  const bytes = fs.readFileSync(file)
  const name = path.basename(file)
  const reserved = await api('/v1/appScreenshots', 'POST', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName: name, fileSize: bytes.length },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
    },
  })
  if (reserved.status !== 201) return console.log(`    ✗ reserve ${name}: ${reserved.status}\n      ${errs(reserved)}`) || null

  const id = reserved.body.data.id
  for (const op of reserved.body.data.attributes.uploadOperations || []) {
    const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]))
    const put = await fetch(op.url, {
      method: op.method,
      headers,
      body: bytes.subarray(op.offset, op.offset + op.length),
    })
    if (!put.ok) return console.log(`    ✗ PUT ${name}: ${put.status}`) || null
  }

  const done = await api(`/v1/appScreenshots/${id}`, 'PATCH', {
    data: {
      type: 'appScreenshots',
      id,
      attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(bytes).digest('hex') },
    },
  })
  if (done.status !== 200) return console.log(`    ✗ commit ${name}: ${done.status}\n      ${errs(done)}`) || null
  console.log(`    ✓ ${index + 1}. ${name}`)
  return id
}

;(async () => {
  const versions = await api(`/v1/apps/${APP_ID}/appStoreVersions?limit=10`)
  const version = versions.body?.data?.find((v) => v.attributes.appStoreState !== 'READY_FOR_SALE')
  if (!version) return console.log('• no editable version')
  console.log(`version ${version.attributes.versionString} — ${version.attributes.appStoreState}`)

  const locs = await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)
  const loc = locs.body?.data?.find((l) => l.attributes.locale === 'en-US')
  if (!loc) return console.log('✗ no en-US localization')

  const sets = await api(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`)
  const existing = sets.body?.data || []
  console.log('existing sets: ' + (existing.map((s) => s.attributes.screenshotDisplayType).join(', ') || 'none'))

  for (const step of PLAN) {
    const files = fs.readdirSync(path.join(ROOT, step.dir)).filter((f) => f.endsWith('.png')).sort()
    console.log(`\n${step.displayType} — ${files.length} file(s) from ${step.dir}/`)
    if (DRY_RUN) {
      console.log(`  would delete sets: ${step.replaces.join(', ')}`)
      files.forEach((f, i) => console.log(`  would upload ${i + 1}. ${f}`))
      continue
    }

    // Clearing the whole set removes its screenshots with it.
    for (const type of step.replaces) {
      for (const s of existing.filter((e) => e.attributes.screenshotDisplayType === type)) {
        const del = await api(`/v1/appScreenshotSets/${s.id}`, 'DELETE')
        console.log(del.status === 204 ? `  ✓ removed old ${type} set` : `  ✗ removing ${type}: ${del.status}\n      ${errs(del)}`)
      }
    }

    const created = await api('/v1/appScreenshotSets', 'POST', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: step.displayType },
        relationships: {
          appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } },
        },
      },
    })
    if (created.status !== 201) { console.log(`  ✗ create set: ${created.status}\n      ${errs(created)}`); continue }
    const setId = created.body.data.id

    const ids = []
    for (const [i, f] of files.entries()) {
      const id = await uploadOne(setId, path.join(ROOT, step.dir, f), i)
      if (id) ids.push(id)
    }

    // Filename order is the intended display order; the API does not infer it.
    if (ids.length) {
      const ordered = await api(`/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, 'PATCH', {
        data: ids.map((id) => ({ type: 'appScreenshots', id })),
      })
      console.log(ordered.status === 204 ? '  ✓ display order set' : `  • could not set order (${ordered.status})`)
    }
  }
})().catch((e) => console.error('FATAL', e.message))
