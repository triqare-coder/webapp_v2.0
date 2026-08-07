import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The TTL is the fix for a real incident: with none set, FCM stores an undelivered
// dispatch for FOUR WEEKS and hands it to the driver's phone on reconnect, sirening
// for an emergency that ended days earlier.
//
// The two fields have DIFFERENT units and shapes, which is exactly how this gets
// silently reverted to the default:
//   android.ttl      → a DURATION in MILLISECONDS
//   apns-expiration  → an ABSOLUTE UNIX time in SECONDS
// These tests pin both.

const sendEachForMulticast = vi.fn()

vi.mock('firebase-admin/app', () => ({
  cert: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({ name: 'push' })),
}))

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({ sendEachForMulticast })),
}))

const NOW_MS = Date.parse('2026-07-29T10:00:00.000Z')
const NOW_SECONDS = Math.floor(NOW_MS / 1000)

async function send(payloadOverrides: Record<string, unknown> = {}) {
  const { sendToTokens } = await import('@/lib/push/fcm')
  await sendToTokens(['token-a'], {
    title: 'T',
    body: 'B',
    data: { type: 'sos_new_request' },
    ...payloadOverrides,
  } as Parameters<typeof sendToTokens>[1])
  return sendEachForMulticast.mock.calls.at(-1)?.[0]
}

beforeEach(() => {
  vi.resetModules()
  sendEachForMulticast.mockReset()
  sendEachForMulticast.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] })
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
    project_id: 'sos-app-24a59-8fb38',
    client_email: 'test@example.com',
    private_key: 'key',
  })
  vi.useFakeTimers()
  vi.setSystemTime(NOW_MS)
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.FIREBASE_SERVICE_ACCOUNT
})

describe('push TTL', () => {
  it('always sets an expiry — never falls back to FCM’s four-week default', async () => {
    const message = await send()
    expect(message.android.ttl).toBeDefined()
    expect(message.apns.headers['apns-expiration']).toBeDefined()
  })

  it('expresses android.ttl as a duration in milliseconds', async () => {
    const message = await send({ ttlSeconds: 90 })
    expect(message.android.ttl).toBe(90_000)
  })

  it('expresses apns-expiration as an absolute epoch time in seconds', async () => {
    const message = await send({ ttlSeconds: 90 })
    // Absolute, not a duration: now + ttl. A duration here would mean 1970.
    expect(message.apns.headers['apns-expiration']).toBe(String(NOW_SECONDS + 90))
  })

  it('applies the default TTL when a caller omits one', async () => {
    const { DEFAULT_PUSH_TTL_SECONDS } = await import('@/lib/push/fcm')
    const message = await send()
    expect(message.android.ttl).toBe(DEFAULT_PUSH_TTL_SECONDS * 1000)
    expect(message.apns.headers['apns-expiration']).toBe(
      String(NOW_SECONDS + DEFAULT_PUSH_TTL_SECONDS)
    )
  })

  it('clamps a negative or expired TTL to zero rather than sending a bad header', async () => {
    const message = await send({ ttlSeconds: -30 })
    expect(message.android.ttl).toBe(0)
    expect(message.apns.headers['apns-expiration']).toBe(String(NOW_SECONDS))
  })

  it('sets a TTL on data-only sends too — the dispatch that actually sirens', async () => {
    const message = await send({ dataOnly: true, ttlSeconds: 120 })
    // Data-only is the driver dispatch path; it must not be the one that leaks.
    expect(message.notification).toBeUndefined()
    expect(message.android.ttl).toBe(120_000)
    expect(message.apns.headers['apns-expiration']).toBe(String(NOW_SECONDS + 120))
  })

  it('keeps the SOS channel on notification sends so alerts are never silent', async () => {
    const message = await send()
    const { SOS_CHANNEL_ID } = await import('@/lib/push/fcm')
    expect(message.android.notification.channelId).toBe(SOS_CHANNEL_ID)
  })
})

// iOS has no equivalent of the Android data-only path: nothing renders a data-only
// push there, so the driver's dispatch alert arrived as a silent background wake-up
// and showed NOTHING. `iosAlert` splits the two platforms inside one message.
describe('iOS alert delivery', () => {
  it('gives the opted-in data-only dispatch a real alert on iOS', async () => {
    const message = await send({ dataOnly: true, iosAlert: true })
    expect(message.apns.payload.aps.alert).toEqual({ title: 'T', body: 'B' })
    // The long siren — see the ring-duration tests below.
    expect(message.apns.payload.aps.sound).toBe('sos_alert_long.wav')
    expect(message.apns.headers['apns-push-type']).toBe('alert')
  })

  it('keeps that same message pure data for Android, so notifee still sirens', async () => {
    const message = await send({ dataOnly: true, iosAlert: true })
    // A `notification` block would have the OS render it and never run our JS —
    // the exact regression this flag must not cause.
    expect(message.notification).toBeUndefined()
    expect(message.android.notification).toBeUndefined()
    expect(message.data.title).toBe('T')
  })

  it('leaves a stand-down silent on iOS — it exists to STOP an alert, not raise one', async () => {
    const message = await send({ dataOnly: true })
    expect(message.apns.payload.aps.alert).toBeUndefined()
    expect(message.apns.payload.aps['content-available']).toBe(1)
    expect(message.apns.headers['apns-push-type']).toBe('background')
  })

  it('sends silent pushes at priority 5 — APNs rejects a background push at 10', async () => {
    const message = await send({ dataOnly: true, priority: 'high' })
    expect(message.apns.headers['apns-priority']).toBe('5')
    // Android still gets the high priority it needs to wake a dozing device.
    expect(message.android.priority).toBe('high')
  })

  it('still sounds the SOS ringtone on ordinary notification sends', async () => {
    const message = await send()
    expect(message.apns.payload.aps.sound).toBe('sos_alert.wav')
    expect(message.apns.headers['apns-priority']).toBe('10')
  })
})

// iOS plays a notification sound once and caps it at 30s, so ring DURATION is a property
// of the bundled file, not of any flag. The dispatch gets the 27.7s loop; nothing else
// does, or a "driver arrived" banner would siren for half a minute.
describe('iOS ring duration', () => {
  it('gives the dispatch the long siren', async () => {
    const message = await send({ dataOnly: true, iosAlert: true })
    expect(message.apns.payload.aps.sound).toBe('sos_alert_long.wav')
  })

  it('leaves lifecycle notifications on the short one', async () => {
    const message = await send()
    expect(message.apns.payload.aps.sound).toBe('sos_alert.wav')
  })

  it('sends a plain sound string while critical alerts are unapproved', async () => {
    // The critical object without Apple's entitlement risks APNs rejecting the push —
    // i.e. NO alert instead of a quiet one. Default must stay off.
    const message = await send({ dataOnly: true, iosAlert: true })
    expect(typeof message.apns.payload.aps.sound).toBe('string')
  })

  it('upgrades the dispatch to a critical alert once the flag is set', async () => {
    process.env.IOS_CRITICAL_ALERTS = '1'
    try {
      const message = await send({ dataOnly: true, iosAlert: true })
      // firebase-admin serializes `critical: true` to APNs' `"critical": 1` on the wire.
      expect(message.apns.payload.aps.sound).toEqual({
        critical: true,
        name: 'sos_alert_long.wav',
        volume: 1.0,
      })
    } finally {
      delete process.env.IOS_CRITICAL_ALERTS
    }
  })

  it('never makes a lifecycle push critical, even with the flag on', async () => {
    process.env.IOS_CRITICAL_ALERTS = '1'
    try {
      const message = await send()
      expect(message.apns.payload.aps.sound).toBe('sos_alert.wav')
    } finally {
      delete process.env.IOS_CRITICAL_ALERTS
    }
  })
})
