import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'

// GET /api/sos-requests/stats - Get SOS requests statistics
export async function GET(request: NextRequest) {
  try {
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
