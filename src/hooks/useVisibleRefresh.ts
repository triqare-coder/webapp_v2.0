'use client'

import { useEffect, useRef } from 'react'

// Fallback refresh cadence while the tab is visible; Realtime normally wins.
export const LIVE_POLL_MS = 15_000

/**
 * Re-run `refresh` every `intervalMs` while the tab is visible, and as soon as
 * it becomes visible again.
 *
 * Driver duty can't rely on Realtime alone: `drivers` was missing from the
 * supabase_realtime publication on live (see
 * migrations/99_updates/transport_realtime_publication.sql), and duty also
 * depends on device_tokens, which anon Realtime can never see. Always reads the
 * latest `refresh`, so callers don't need to memoise it.
 */
export function useVisibleRefresh(refresh: () => void, enabled = true, intervalMs = LIVE_POLL_MS) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled) return
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refreshRef.current()
    }
    const poll = setInterval(refreshIfVisible, intervalMs)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [enabled, intervalMs])
}
