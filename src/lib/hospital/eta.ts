export interface LatLng {
  lat: number
  lng: number
}

/**
 * Driving ETA in whole minutes, or null when no route can be produced.
 *
 * SERVER-ONLY. Uses a server-side Google Maps key: the existing
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is browser-restricted by HTTP referrer, so
 * calling Directions with it from a server has no referrer to present and is
 * rejected. GOOGLE_MAPS_SERVER_API_KEY should be an IP-restricted key. The
 * public key is used as a fallback so a misconfigured environment degrades to
 * "no ETA shown" rather than to a broken dashboard.
 *
 * Returning null rather than throwing is deliberate: a missing ETA is a caption
 * the UI can render honestly ("ETA unavailable"), while an exception during an
 * emergency would take the alert banner down with it.
 */
export async function drivingEtaMinutes(origin: LatLng, destination: LatLng): Promise<number | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) {
    console.warn('[hospital-eta] no Google Maps key configured; ETA unavailable')
    return null
  }

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
  url.searchParams.set('mode', 'driving')
  // An ambulance in traffic is the whole point of the estimate.
  url.searchParams.set('departure_time', 'now')
  url.searchParams.set('region', 'in')
  url.searchParams.set('key', key)

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'OK') {
      console.warn('[hospital-eta] directions status:', data.status)
      return null
    }
    const leg = data.routes?.[0]?.legs?.[0]
    const seconds = leg?.duration_in_traffic?.value ?? leg?.duration?.value
    if (typeof seconds !== 'number') return null
    // Round up: "arriving in 1 minute" is a safer thing to tell a resus team
    // than a zero that reads as "already here".
    return Math.max(1, Math.ceil(seconds / 60))
  } catch (err) {
    console.error('[hospital-eta] request failed:', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

/** "Arriving in 12 minutes" / "Arriving in 1 minute" / null-safe caption. */
export function formatEta(minutes: number | null | undefined): string {
  if (minutes == null) return 'ETA unavailable'
  if (minutes <= 1) return 'Arriving in 1 minute'
  return `Arriving in ${minutes} minutes`
}
