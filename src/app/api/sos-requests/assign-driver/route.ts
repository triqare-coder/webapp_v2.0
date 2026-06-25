import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'

// POST /api/sos-requests/assign-driver - Assign a driver to a SOS request.
// Delegates to SOSRequestService.assignDriver, which writes the canonical inline
// model (sos_requests.driver_id/name/phone + status 'Driver En Route'), marks the
// driver busy, appends status_history, and dual-writes the legacy junction table.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sos_request_id, driver_id, auto_assigned } = body

    if (!sos_request_id || !driver_id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID and driver ID are required' },
        { status: 400 }
      )
    }

    const updated = await SOSRequestService.assignDriver(sos_request_id, driver_id, {
      autoAssigned: auto_assigned ?? false,
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Driver assigned successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    // Map known guard failures to 4xx; everything else is a 500.
    const status =
      message.includes('not found') ? 404 :
      message.includes('already assigned') || message.includes('completed or cancelled') ? 400 :
      500
    console.error('Error in POST /api/sos-requests/assign-driver:', message)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

// DELETE /api/sos-requests/assign-driver?sos_request_id=... - Remove a driver assignment.
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sos_request_id = searchParams.get('sos_request_id')

    if (!sos_request_id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID is required' },
        { status: 400 }
      )
    }

    await SOSRequestService.unassignDriver(sos_request_id)

    return NextResponse.json({
      success: true,
      message: 'Driver assignment removed successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/sos-requests/assign-driver:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
