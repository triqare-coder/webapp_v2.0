import { NextRequest, NextResponse } from 'next/server'
import { emergencyContactService } from '@/services/emergencyContactService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contact = await emergencyContactService.getEmergencyContact(id)

    if (!contact) {
      return NextResponse.json(
        { error: 'Emergency contact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const contact = await emergencyContactService.updateEmergencyContact(id, body)

    if (!contact) {
      return NextResponse.json(
        { error: 'Emergency contact not found or failed to update' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to update emergency contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await emergencyContactService.deleteEmergencyContact(id)

    if (!success) {
      return NextResponse.json(
        { error: 'Emergency contact not found or failed to delete' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Emergency contact deleted successfully' })
  } catch (error) {
    console.error('Error deleting emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete emergency contact' },
      { status: 500 }
    )
  }
}
