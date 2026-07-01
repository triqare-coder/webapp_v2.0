import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'

// Cron endpoint: auto-reset stale no-driver SOS requests.
//
// Enforces the admin-configurable `sos_request_timeout_minutes` server-side so an
// unassigned 'SOS Triggered' request can never sit active forever when no driver is
// available — independent of whether any patient/staff app is open. The dashboards
// already sweep on-view (see SOSRequestService.expireStaleRequests); this endpoint
// lets an external scheduler (Vercel Cron, GitHub Actions, etc.) run the same sweep
// on a fixed cadence. `force: true` bypasses the per-instance reap-on-view throttle.
//
// Secure (optional) with the CRON_SECRET env var, matching /api/cron/sync-users.
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await SOSRequestService.expireStaleRequests({ force: true })

    return NextResponse.json({
      success: !result.error,
      timestamp: new Date().toISOString(),
      expired: result.expired,
      ...(result.error ? { error: result.error } : {}),
      message: result.error
        ? `SOS timeout sweep failed: ${result.error}`
        : `SOS timeout sweep completed: ${result.expired} request(s) expired`,
    })
  } catch (error: any) {
    console.error('❌ expire-sos-requests cron failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'unknown error',
        timestamp: new Date().toISOString(),
        message: 'SOS timeout sweep failed',
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers.
export async function POST(req: NextRequest) {
  return GET(req)
}
