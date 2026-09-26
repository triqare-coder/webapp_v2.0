'use client'

import { useEffect, useState } from 'react'

const ETA_REFRESH_MS = 60_000

export interface LiveEta {
  minutes: number | null
  /** Why there is no number, from the ETA route (no_driver_location, route_unavailable…). */
  reason: string | null
  updatedAt: string | null
}

/**
 * Live ETA for each confirmed-incoming alert, recomputed server-side from the
 * driver's GPS every 60s (US-008). Keyed by the joined id list so a realtime
 * reload that returns the same alerts does not restart the timers.
 */
export function useLiveEtas(alertIds: string[]): Record<string, LiveEta> {
  const [etas, setEtas] = useState<Record<string, LiveEta>>({})
  const key = [...alertIds].sort().join(',')

  useEffect(() => {
    if (!key) return
    const ids = key.split(',')
    let cancelled = false

    const poll = async () => {
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/hospital/alerts/${id}/eta`)
            if (!res.ok || cancelled) return
            const data = await res.json()
            setEtas((prev) => ({
              ...prev,
              [id]: { minutes: data.etaMinutes ?? null, reason: data.reason ?? null, updatedAt: data.etaUpdatedAt ?? null },
            }))
          } catch {
            // Keep the last known value; the next poll retries.
          }
        }),
      )
    }

    void poll()
    const timer = window.setInterval(poll, ETA_REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [key])

  return etas
}

/** Short table caption: "12 min", or why there is no figure. */
export function etaCaption(eta: LiveEta | undefined, fallbackMinutes?: number | null): string {
  const minutes = eta?.minutes ?? fallbackMinutes ?? null
  if (minutes != null) return minutes <= 1 ? '1 min' : `${minutes} min`
  if (!eta) return 'Calculating…'
  if (eta.reason === 'no_driver_location') return 'Awaiting ambulance GPS'
  return 'Unavailable'
}
