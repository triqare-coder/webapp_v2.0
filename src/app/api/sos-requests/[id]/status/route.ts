import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'

// PUT /api/sos-requests/[id]/status - Update SOS request status
export async function PUT(
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

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses: string[] = ['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const result = await SOSRequestService.updateStatus(id, body.status)

    return NextResponse.json({
      sos_request: result,
      message: 'Status updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/sos-requests/[id]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
