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

    if (!body.assigned_by) {
      return NextResponse.json(
        { error: 'Assigned by user ID is required' },
        { status: 400 }
      )
    }

    const result = await SOSRequestService.assignDriver(id, body.driver_id)

    return NextResponse.json({
      sos_request: result,
      message: 'Driver assigned successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/sos-requests/[id]/assign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
