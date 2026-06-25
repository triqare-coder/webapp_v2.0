import { NextRequest, NextResponse } from 'next/server'
import { SOSRequestService } from '@/services/sosRequestService'
import { normalizeSOSStatus, SOS_STATUSES } from '@/lib/sosStatus'

// Update an SOS request's status. Accepts both legacy snake_case and canonical values
// (normalized to the DB's canonical workflow); appends status_history, stamps
// assigned_at/completed_at, and releases the driver on terminal states.
async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'SOS request ID is required' }, { status: 400 })
    }
    if (!body.status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const canonical = normalizeSOSStatus(body.status)
    if (!canonical) {
      return NextResponse.json(
        { error: `Invalid status value. Must map to one of: ${SOS_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await SOSRequestService.updateStatus(id, canonical)

    return NextResponse.json({
      success: true,
      sos_request: result,
      message: 'Status updated successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error updating SOS request status:', message)
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 500 })
  }
}

// Support PATCH (REST-correct) and PUT (existing clients).
export const PATCH = handle
export const PUT = handle
