// FCM transport — the only place that talks to Firebase.
//
// Sends via the FCM HTTP v1 API through firebase-admin, which handles the
// service-account OAuth exchange for us. Callers hand it a set of device tokens
// and a payload; it fans out and reports which tokens are dead.
//
// IMPORTANT: FCM tokens are scoped to the Firebase project that minted them. The
// service account in FIREBASE_SERVICE_ACCOUNT must belong to the SAME project as
// the google-services.json bundled into the mobile app (sos-app-24a59-8fb38), or
// every send fails with a SenderId mismatch.

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

/**
 * The Android channel the app creates at MAX importance — heads-up + sound.
 * Must stay in lockstep with `Triqare-app/services/fcm-service.ts`: a push naming
 * a channel the app has not created falls back to the silent "Miscellaneous"
 * bucket, which for an ambulance dispatch means the driver never hears it.
 *
 * The version suffix exists because a channel's sound cannot be changed after
 * creation — every ringtone change requires a new id.
 *
 * v3 (2026-07-29): drivers heard the siren in the foreground but silence when the
 * app was backgrounded or killed. Foreground sound comes from the app's own looping
 * audio player; background/killed sound can only come from the CHANNEL, since no JS
 * runs. Devices that created v2 from a build missing res/raw/sos_alert.wav got a
 * permanently soundless channel, and channel settings are immutable — so a fresh id
 * was the only way to give existing installs a working siren.
 *
 * DEPLOY ORDER MATTERS: ship the APK BEFORE this value goes live. A push naming a
 * channel the app has not created yet falls back to the silent "Miscellaneous"
 * bucket, so a web deploy that runs ahead of the APK rollout makes things worse, not
 * better.
 */
export const SOS_CHANNEL_ID = 'sos-emergency-v3'

/**
 * The bundled SOS ringtone. Android resolves this against `res/raw` (no file
 * extension); iOS wants the filename, so the two differ by design.
 */
const SOS_SOUND_ANDROID = 'sos_alert'
const SOS_SOUND_IOS = 'sos_alert.wav'

/**
 * A 27.7s loop of the same siren, for the driver's dispatch alert on iOS only.
 *
 * iOS plays a notification sound exactly ONCE and caps it at 30 seconds. There is no
 * looping flag — Android's continuous ring comes from notifee re-raising the alert, and
 * nothing equivalent exists here. So the only way to make an iOS dispatch ring instead
 * of blip is to ship a long file: 2.31s becomes 27.7s of siren, which is the practical
 * ceiling without Apple's Critical Alerts entitlement.
 *
 * Bundled by the expo-notifications plugin's `sounds` array in app.json. If that entry
 * is ever removed, iOS silently falls back to the DEFAULT chime — it does not error.
 */
const SOS_SOUND_IOS_LONG = 'sos_alert_long.wav'

/**
 * Send the dispatch as an APNs *critical* alert: rings at a caller-set volume even in
 * Silent Mode, Do Not Disturb and any Focus mode, and shows without the user having to
 * unlock. This is the closest iOS gets to Android's full-screen insistent siren.
 *
 * OFF BY DEFAULT AND MUST STAY THAT WAY UNTIL APPLE APPROVES. Critical alerts need the
 * `com.apple.developer.usernotifications.critical-alerts` entitlement, granted per-app
 * by a review form, and the entitlement must be in the signed build's provisioning
 * profile. Sending `critical: 1` to a build without it does not upgrade the alert — APNs
 * can reject the push outright, which would mean NO dispatch alert at all rather than a
 * merely quiet one. So this stays behind an env flag that is flipped only once an
 * approved build is live.
 *
 * Enable with IOS_CRITICAL_ALERTS=1 once, and only once, both are true:
 *   1. Apple has approved the entitlement for com.triqare.qsos, AND
 *   2. a build carrying that entitlement is the one installed on testers' phones.
 */
const IOS_CRITICAL_ALERTS = process.env.IOS_CRITICAL_ALERTS === '1'

/**
 * Fallback time-to-live for any push that does not set its own.
 *
 * FCM's own default is FOUR WEEKS: a message sent to an unreachable device is
 * stored and delivered whenever that device next comes online. For ambulance
 * dispatch that is catastrophic — a driver whose phone was off received an SOS
 * push TWO DAYS after the fact, sirening for an emergency long since over. No app
 * code can prevent it, because the delay happens entirely inside FCM before
 * anything of ours runs. The transport layer is the only place it can be stopped.
 *
 * Ten minutes suits the informational lifecycle events (driver arrived, trip
 * complete …) — past that the app's own live screen is the truth and a stale
 * banner is merely confusing. The dispatch and stand-down pushes override this
 * with much shorter, situation-specific values; see sosPush.ts.
 */
export const DEFAULT_PUSH_TTL_SECONDS = 600

export interface PushPayload {
  title: string
  body: string
  /** Routed on by the mobile app. FCM requires every data value to be a string. */
  data: Record<string, string>
  /** `high` wakes a dozing device immediately. Use it for anything time-critical. */
  priority?: 'high' | 'normal'
  /**
   * How long FCM/APNs may keep trying to deliver, in seconds. Once it elapses the
   * message is DISCARDED rather than delivered late.
   *
   * Set it to the remaining useful life of whatever the push is about — for a
   * dispatch, the time left before the SOS expires. Omitted → DEFAULT_PUSH_TTL_SECONDS.
   * Never omit it meaning "forever"; forever is what caused the stale-siren bug.
   */
  ttlSeconds?: number
  /**
   * Send WITHOUT a `notification` block, so the app renders the alert itself.
   *
   * A message carrying a `notification` block is rendered by the OS, and in the
   * KILLED state it never wakes our JS — which means the alert can only be the
   * channel's one-shot 2.31s sound. The driver's SOS alert has to ring continuously
   * like an incoming call, so it goes data-only: Firebase then delivers it to the
   * app's headless background handler in every app state, and the app displays it
   * via notifee with a looping siren and a full-screen intent.
   * See Triqare-app/services/sos-call-notification.ts.
   *
   * The cost: nothing is displayed at all if the headless task never runs (some OEM
   * battery killers). Use this ONLY for alerts the app is guaranteed to handle —
   * everything else should keep its `notification` block, which the OS always shows.
   *
   * `title`/`body` are copied into `data` so the app still has the copy to display.
   */
  dataOnly?: boolean
  /**
   * For a `dataOnly` send, ALSO give iOS a real alert (title/body/sound) instead of a
   * silent `content-available` push.
   *
   * Android and iOS need opposite things from the dispatch alert, and this flag is
   * where they part company. On Android, data-only is what lets notifee draw the
   * looping full-screen siren. On iOS there is no equivalent: nothing renders a
   * data-only push, `sos-call-notification.ts` is Android-gated, and a continuous
   * siren needs Apple's Critical Alerts entitlement. Sent as-is, an iOS driver got a
   * silent background wake-up and NO visible alert for a new SOS.
   *
   * Setting this puts an explicit `aps.alert` in the apns block, which FCM delivers
   * only to Apple devices — Android still receives a pure data message. The result on
   * iOS is an OS-rendered banner with the SOS ringtone: one-shot rather than looping,
   * but seen and heard.
   *
   * Leave it off for control pushes whose job is to SILENCE an alert (the stand-down),
   * where a banner would be the exact opposite of what is wanted.
   */
  iosAlert?: boolean
}

export interface SendResult {
  sent: number
  failed: number
  /** Tokens FCM reports as permanently dead — the caller should stop storing them. */
  invalidTokens: string[]
  /**
   * True when nothing was even attempted because the sender is not configured
   * (FIREBASE_SERVICE_ACCOUNT missing or unparseable). Without this, that case is
   * indistinguishable from "FCM rejected the send" — both report failed=N — which
   * sent a live debug down the wrong path for hours.
   */
  notConfigured?: boolean
  /** Diagnostic only (never the secret): why the sender is unavailable + the raw env length. */
  configReason?: 'missing' | 'unparseable'
  configLen?: number
}

let app: App | null = null

/**
 * Why the sender is unavailable, for diagnostics only. NEVER contains the secret —
 * just a reason code and the raw value's length, which is enough to tell "not set"
 * from "set but truncated/mangled by the dashboard" without leaking anything.
 */
let configReason: 'missing' | 'unparseable' | undefined
let configLen = 0

export function getSenderConfigDiagnostic(): {
  reason?: 'missing' | 'unparseable'
  len: number
} {
  return { reason: configReason, len: configLen }
}

/**
 * Lazily initialize the Admin SDK. Returns null (rather than throwing) when the
 * service account is not configured, so a misconfigured deploy degrades to
 * "pushes don't send" instead of "every SOS write 500s".
 */
function getFirebaseApp(): App | null {
  if (app) return app

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  configLen = raw ? raw.length : 0
  if (!raw) {
    configReason = 'missing'
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT is not set — push notifications disabled')
    return null
  }

  try {
    // Accept either raw JSON or base64-encoded JSON: the private key is multi-line,
    // and some dashboards mangle newlines in plain env values.
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8')
    const serviceAccount = JSON.parse(json)

    const existing = getApps()
    app = existing.length
      ? existing[0]
      : initializeApp({ credential: cert(serviceAccount) }, 'push')

    configReason = undefined
    return app
  } catch (err) {
    configReason = 'unparseable'
    console.error(
      `[push] FIREBASE_SERVICE_ACCOUNT could not be parsed (raw length ${configLen}; expected ~3196 for the base64 blob — a shorter value means the dashboard truncated it)`,
      err
    )
    return null
  }
}

/**
 * Push `payload` to every token in `tokens`. Deduplicates, tolerates an empty list,
 * and never throws — a send failure must not take down the caller.
 */
export async function sendToTokens(tokens: string[], payload: PushPayload): Promise<SendResult> {
  const unique = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 0))]
  if (unique.length === 0) return { sent: 0, failed: 0, invalidTokens: [] }

  const firebase = getFirebaseApp()
  if (!firebase) {
    const diag = getSenderConfigDiagnostic()
    return {
      sent: 0,
      failed: unique.length,
      invalidTokens: [],
      notConfigured: true,
      configReason: diag.reason,
      configLen: diag.len,
    }
  }

  const priority = payload.priority ?? 'high'

  // Clamped to a non-negative integer. FCM reads ttl in MILLISECONDS; APNs wants an
  // ABSOLUTE epoch-seconds deadline, not a duration — a very easy pair to mix up,
  // and getting either wrong silently restores the four-week default.
  const ttlSeconds = Math.max(
    0,
    Math.floor(payload.ttlSeconds ?? DEFAULT_PUSH_TTL_SECONDS)
  )
  const apnsExpiration = String(Math.floor(Date.now() / 1000) + ttlSeconds)

  try {
    const dataOnly = payload.dataOnly === true

    // Whether Apple devices get a visible alert. Everything with a `notification`
    // block does; a data-only send only does when it opts in (see `iosAlert`).
    const iosAlert = !dataOnly || payload.iosAlert === true

    // The apns block is built once, because the two shapes differ in more than the
    // payload: a SILENT push must declare `apns-push-type: background` and be sent at
    // priority 5. APNs rejects a background push at priority 10 outright
    // (`BadPriority`), so the message's own high priority cannot be passed through here.
    // Only the dispatch (the one push that must actually ring) gets the long siren; a
    // "driver arrived" banner ringing for half a minute would be its own problem.
    const isDispatch = dataOnly && payload.iosAlert === true
    const soundName = isDispatch ? SOS_SOUND_IOS_LONG : SOS_SOUND_IOS
    const sound =
      isDispatch && IOS_CRITICAL_ALERTS
        ? // The critical form is an OBJECT, not a string. firebase-admin takes a boolean
          // here and serializes it to APNs' `"critical": 1` itself. `volume` is 0–1 and
          // overrides the device volume, so it is deliberately full: a driver who
          // silenced their phone still has to hear an ambulance dispatch.
          { critical: true, name: soundName, volume: 1.0 }
        : soundName

    /**
     * How hard iOS is allowed to interrupt for this notification.
     *
     * `time-sensitive` breaks through Do Not Disturb and every Focus mode — the gap that
     * matters here, since drivers keep a Focus on between calls and a suppressed dispatch
     * is one nobody hears. It needs the
     * `com.apple.developer.usernotifications.time-sensitive` entitlement, which is free
     * (an App ID checkbox, no Apple review) and is in the signed build's profile.
     *
     * `critical` goes further and also defeats Silent Mode, but rides on the
     * review-gated critical-alerts entitlement, so it is tied to the same flag as the
     * critical sound above — the two must agree or APNs gets a payload claiming a
     * privilege the build does not hold.
     *
     * Set for the dispatch only. Interrupting a Focus mode to say "trip complete" is
     * exactly the abuse that gets an entitlement pulled.
     */
    const interruptionLevel = IOS_CRITICAL_ALERTS ? 'critical' : 'time-sensitive'

    const apns = iosAlert
      ? {
          payload: {
            aps: {
              // Set explicitly rather than relying on FCM's mapping of the top-level
              // `notification` block, since data-only sends have no such block.
              alert: { title: payload.title, body: payload.body },
              sound,
              badge: 1,
              ...(isDispatch ? { 'interruption-level': interruptionLevel } : {}),
            },
          },
          headers: {
            'apns-push-type': 'alert',
            'apns-priority': priority === 'high' ? '10' : '5',
            'apns-expiration': apnsExpiration,
          },
        }
      : {
          // `content-available` is what makes iOS deliver a silent data push to the
          // app. NOTE iOS cannot loop a sound from one of these — a continuous siren
          // there needs the Critical Alerts entitlement from Apple. Android only for now.
          payload: { aps: { 'content-available': 1 } },
          headers: {
            'apns-push-type': 'background',
            'apns-priority': '5',
            'apns-expiration': apnsExpiration,
          },
        }

    // A `notification` block means Android/iOS render the tray notification
    // themselves when the app is backgrounded or killed — no JS runs. The `data`
    // block rides along for tap-routing. Foreground delivery has no OS-rendered
    // notification, so the app re-presents it locally (see services/fcm-messaging.ts).
    //
    // A data-only message omits it — AND must omit `android.notification` too, or FCM
    // treats the message as a notification message anyway and renders it itself,
    // which is exactly what we are trying to avoid. What is left is `priority: high`,
    // enough to wake a dozing device and run the headless handler.
    const message = dataOnly
      ? {
          tokens: unique,
          // No notification block, so the copy has to travel in `data`.
          data: { ...payload.data, title: payload.title, body: payload.body },
          android: { priority, ttl: ttlSeconds * 1000 },
          apns,
        }
      : {
          tokens: unique,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
          android: {
            priority,
            ttl: ttlSeconds * 1000,
            notification: {
              // Without an explicit channel the OS drops these into the low-importance
              // "Miscellaneous" bucket — silent, no heads-up. Fatal for SOS dispatch.
              channelId: SOS_CHANNEL_ID,
              // On Android 8+ the CHANNEL owns the sound and this field is ignored;
              // it still matters on older devices, so both name the SOS ringtone.
              sound: SOS_SOUND_ANDROID,
              defaultVibrateTimings: true,
            },
          },
          apns,
        }

    const response = await getMessaging(firebase).sendEachForMulticast(message)

    const invalidTokens: string[] = []
    response.responses.forEach((r, i) => {
      if (r.success) return
      const code = r.error?.code
      // These two mean the token will never work again (app uninstalled, data
      // cleared, token rotated). Anything else — network blip, quota — is transient
      // and the token must be kept.
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(unique[i])
      } else {
        console.warn(`[push] send failed for a token: ${code ?? 'unknown error'}`)
      }
    })

    return {
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens,
    }
  } catch (err) {
    console.error('[push] sendEachForMulticast threw', err)
    return { sent: 0, failed: unique.length, invalidTokens: [] }
  }
}

export interface SenderVerifyResult {
  /** FIREBASE_SERVICE_ACCOUNT is present and parses into a Firebase app. */
  configured: boolean
  /** When not configured: why + the raw env length (never the secret). */
  reason?: 'missing' | 'unparseable'
  len: number
  /**
   * Whether the service account can actually AUTHENTICATE to FCM. Determined by a
   * dry-run send (delivers nothing) to a deliberately-invalid token:
   *  - 'ok'         → FCM rejected the token but ACCEPTED the credentials → the
   *                   service account works. This is the definitive "push can send".
   *  - 'failed'     → FCM rejected the credentials (wrong/expired key, wrong project).
   *  - 'unconfigured' → couldn't even init (see reason).
   *  - 'unknown'    → an unexpected error; see detail.
   */
  fcmAuth: 'ok' | 'failed' | 'unconfigured' | 'unknown'
  /** Diagnostic error code/message from the dry run (never secrets). */
  detail?: string
}

/**
 * Verify the sender end-to-end WITHOUT delivering anything: init the Admin SDK, then
 * do an FCM dry-run send to a dummy token. A dry run validates credentials + message
 * against Google's servers but never delivers, so this is a safe, on-demand health
 * check for "is FIREBASE_SERVICE_ACCOUNT set correctly on this deploy" — the single
 * make-or-break unknown that otherwise only surfaces on a real SOS.
 */
export async function verifySender(): Promise<SenderVerifyResult> {
  const firebase = getFirebaseApp()
  if (!firebase) {
    const diag = getSenderConfigDiagnostic()
    return { configured: false, reason: diag.reason, len: diag.len, fcmAuth: 'unconfigured' }
  }

  const diag = getSenderConfigDiagnostic()
  try {
    await getMessaging(firebase).send(
      { token: 'push-selftest-invalid-token-000', notification: { title: 't', body: 'b' } },
      true // dryRun — validates only, delivers nothing
    )
    // A dummy token can't actually succeed; if it somehow does, creds are clearly fine.
    return { configured: true, len: diag.len, fcmAuth: 'ok' }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? ''
    const message = (err as { message?: string })?.message ?? String(err)
    // Token-level rejections mean AUTH SUCCEEDED (we reached FCM; it just disliked the
    // fake token) → the service account is good.
    if (
      code === 'messaging/invalid-argument' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/registration-token-not-registered'
    ) {
      return { configured: true, len: diag.len, fcmAuth: 'ok' }
    }
    // Credential/permission failures mean the service account itself is bad.
    if (
      code.includes('credential') ||
      code.includes('authentication') ||
      /PERMISSION_DENIED|UNAUTHENTICATED|invalid_grant|account not found/i.test(message)
    ) {
      return { configured: true, len: diag.len, fcmAuth: 'failed', detail: code || message }
    }
    return { configured: true, len: diag.len, fcmAuth: 'unknown', detail: code || message }
  }
}
