'use client'

import { useEffect, useState } from 'react'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appLinks'

/**
 * One link that does the right thing: open QSoS if it is installed, otherwise
 * send the visitor to their store listing.
 *
 * WHY A WEB PAGE AND NOT A LINK STRAIGHT TO THE APP. Emails cannot run code and
 * cannot see what is installed on the device, so an invite can only ever carry a
 * single static URL. That URL has to land somewhere that CAN make the decision.
 * This page is that somewhere — `/get-app` is what every "Get the app" call to
 * action points at.
 *
 * ANDROID uses an `intent:` URL. Chrome resolves it against the installed package
 * and, when the package is absent, follows `S.browser_fallback_url` to Play by
 * itself. That is a first-class Android mechanism: no timers, no guessing, and no
 * error dialog when the app is missing.
 *
 * iOS GOES STRAIGHT TO THE APP STORE. It has no intent: equivalent, and the
 * obvious substitute — request `qsos://` and race a timer to the store — is worse
 * than useless: when nothing handles the scheme Safari puts up a modal "cannot
 * open the page because the address is invalid", and that modal BLOCKS the
 * fallback timer. The visitor is left staring at an error instead of the store.
 * Since the people scanning a card or opening an invite are overwhelmingly people
 * who do NOT have the app yet, we optimise for them. Anyone who does have it
 * installed lands on a listing whose button already reads "Open" — one tap, no
 * error. A real installed-app handoff on iOS needs Universal Links, not a scheme
 * probe (see below).
 *
 * DESKTOP gets neither; it just shows both badges, because there is nothing to
 * open and silently redirecting a laptop to a phone store is a dead end.
 *
 * A future upgrade is Android App Links + iOS Universal Links, which would let
 * `https://triqare.com/get-app` open the app with no interstitial at all. That
 * needs `.well-known/assetlinks.json` (signing-cert fingerprint), an
 * apple-app-site-association file, and native intent-filter/entitlement changes —
 * a bigger change than this page, and this page keeps working underneath it.
 */

const APP_SCHEME_URL = 'qsos://'
const ANDROID_PACKAGE = 'com.sosapp.emergency'

type Platform = 'android' | 'ios' | 'desktop'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  // iPadOS 13+ reports a desktop UA, so the touch-point check is what catches iPads.
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1) return 'ios'
  return 'desktop'
}

export default function GetAppPage() {
  const [platform, setPlatform] = useState<Platform | null>(null)

  useEffect(() => {
    const detected = detectPlatform()
    setPlatform(detected)

    if (detected === 'android') {
      const fallback = encodeURIComponent(PLAY_STORE_URL)
      window.location.replace(
        `intent://open#Intent;scheme=qsos;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`
      )
      return
    }

    if (detected === 'ios') {
      // No scheme probe first — see the note above. An https apps.apple.com URL
      // is itself handed to the App Store app by iOS, so this is a direct open.
      window.location.replace(APP_STORE_URL)
    }
  }, [])

  const isMobile = platform === 'android' || platform === 'ios'

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">TriQare QSoS</h1>
        <p className="mt-3 text-slate-600">
          {isMobile
            ? 'One moment — taking you to your app store. If nothing happens, use the button below.'
            : 'QSoS is a mobile app. Install it on your phone to continue.'}
        </p>

        {/* Always rendered, never only a fallback: an automatic redirect can be
            blocked by an in-app email browser, and the visitor still needs a way out. */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {platform !== 'ios' && (
            <a
              href={PLAY_STORE_URL}
              className="inline-flex w-64 items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Get it on Google Play
            </a>
          )}
          {platform !== 'android' && (
            <a
              href={APP_STORE_URL}
              className="inline-flex w-64 items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Download on the App Store
            </a>
          )}
        </div>

        {/* Android only. On iOS this same link produces the Safari "address is
            invalid" modal for anyone who does not have the app — the very error
            this page exists to avoid — and iPhone users are already on their way
            to a listing whose button reads "Open" when it is installed. */}
        {platform === 'android' && (
          <p className="mt-6 text-sm text-slate-500">
            Already installed?{' '}
            <a href={APP_SCHEME_URL} className="font-semibold text-[#cc3333] underline">
              Open QSoS
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
