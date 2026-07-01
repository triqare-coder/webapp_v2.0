import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'

// GET /api/sos-requests/stats - Get SOS requests statistics
export async function GET(request: NextRequest) {
  try {
    // Reap stale no-driver requests first so the pending/active counts reflect timeouts.
    await SOSRequestService.expireStaleRequests().catch((e) =>
      console.warn('SOS timeout sweep failed (non-fatal):', e)
    )

    const result = await SOSRequestService.getStats()

    return NextResponse.json({
      stats: result
    })
  } catch (error) {
    console.error('Error in GET /api/sos-requests/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
