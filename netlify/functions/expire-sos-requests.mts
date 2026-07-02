// Netlify Scheduled Function — no-driver SOS timeout backstop.
//
// Runs on the cadence in `config.schedule` and pings the Next.js route
// /api/cron/expire-sos-requests with the CRON_SECRET bearer. That route calls
// SOSRequestService.expireStaleRequests({ force: true }), which auto-cancels
// unassigned 'SOS Triggered' requests older than the admin-configurable
// `sos_request_timeout_minutes`. The dashboards already reap-on-view; this is
// the backstop for when no patient/staff app or dashboard is open.
//
// Netlify injects process.env.URL (the site's production URL) and the site's
// configured env vars (CRON_SECRET). No extra dependencies required — this is a
// standalone v2 function bundled separately from the Next.js app.

export default async () => {
  const base = process.env.URL
  if (!base) {
    console.error('expire-sos-requests: process.env.URL is not set; cannot reach the API route')
    return new Response('Missing site URL', { status: 500 })
  }

  const secret = process.env.CRON_SECRET
  const headers: Record<string, string> = {}
  if (secret) headers.Authorization = `Bearer ${secret}`

  try {
    const res = await fetch(`${base}/api/cron/expire-sos-requests`, { method: 'POST', headers })
    const body = await res.text()
    if (!res.ok) {
      console.error(`expire-sos-requests: route returned ${res.status}: ${body}`)
      return new Response(body, { status: res.status })
    }
    console.log(`expire-sos-requests: ${body}`)
    return new Response(body, { status: 200 })
  } catch (err) {
    console.error('expire-sos-requests: fetch to API route failed', err)
    return new Response('fetch failed', { status: 500 })
  }
}

// Every 2 minutes. Backstop only — reap-on-view covers open dashboards, and the
// timeout window (`sos_request_timeout_minutes`) defaults to 3 minutes.
export const config = {
  schedule: '*/2 * * * *',
}
