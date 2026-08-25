'use client'

import { useEffect, useRef } from 'react'

/**
 * Sign the user out after a period of no interaction.
 *
 * The hospital dashboard requires an 8-hour inactivity timeout with
 * re-authentication. Supabase refresh tokens otherwise keep a session alive
 * indefinitely, so without this a dashboard left open on a ward terminal stays
 * signed in forever — which is the case the requirement exists for.
 *
 * Activity is sampled rather than handled on every event: the listeners only
 * stamp a ref, and a single interval decides when the deadline has passed. That
 * also survives a sleeping laptop, where timers do not fire on schedule but
 * wall-clock time still moves.
 */
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange'] as const

export function useIdleTimeout(onTimeout: () => void, timeoutMs: number = 8 * 60 * 60 * 1000) {
  const lastActive = useRef<number>(Date.now())
  const fired = useRef(false)
  const handler = useRef(onTimeout)
  handler.current = onTimeout

  useEffect(() => {
    const touch = () => {
      lastActive.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }))

    const tick = window.setInterval(() => {
      if (fired.current) return
      if (Date.now() - lastActive.current >= timeoutMs) {
        fired.current = true
        handler.current()
      }
    }, 60_000)

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch))
      window.clearInterval(tick)
    }
  }, [timeoutMs])
}
