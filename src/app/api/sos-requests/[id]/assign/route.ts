import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'

// POST /api/sos-requests/[id]/assign - Assign a driver to a SOS request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'SOS request ID is required' },
        { status: 400 }
      )
    }

    if (!body.driver_id) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    const result = await SOSRequestService.assignDriver(id, body.driver_id, {
      autoAssigned: body.auto_assigned ?? false,
    })

    return NextResponse.json({
      success: true,
      sos_request: result,
      message: 'Driver assigned successfully'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status =
      message.includes('not found') ? 404 :
      message.includes('already assigned') || message.includes('completed or cancelled') ? 400 :
      500
    console.error('Error in POST /api/sos-requests/[id]/assign:', message)
    return NextResponse.json({ error: message }, { status })
  }
}
