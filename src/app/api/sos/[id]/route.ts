import { NextRequest, NextResponse } from 'next/server'
import { SOSService } from '@/services/sosService'

// GET /api/sos/[id] - Get single SOS request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sosRequestId = id

    const { data, error } = await SOSService.getSOSRequestById(sosRequestId)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'SOS request not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/sos/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sos/[id] - Update SOS request (assign driver or update status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, driver_id, status } = body
    const sosRequestId = id

    if (action === 'assign_driver') {
      if (!driver_id) {
        return NextResponse.json(
          { error: 'Driver ID is required for assignment' },
          { status: 400 }
        )
      }

      const { success, error } = await SOSService.assignDriver(sosRequestId, driver_id)
      
      if (error) {
        return NextResponse.json({ error }, { status: 500 })
      }

      return NextResponse.json({ success })
    }

    if (action === 'update_status') {
      if (!status) {
        return NextResponse.json(
          { error: 'Status is required for update' },
          { status: 400 }
        )
      }

      const { success, error } = await SOSService.updateStatus(sosRequestId, status)
      
      if (error) {
        return NextResponse.json({ error }, { status: 500 })
      }

      return NextResponse.json({ success })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "assign_driver" or "update_status"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in PUT /api/sos/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sos/[id] - Delete SOS request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sosRequestId = id

    const { success, error } = await SOSService.deleteSOSRequest(sosRequestId)
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('Error in DELETE /api/sos/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
