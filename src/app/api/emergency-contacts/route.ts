import { NextRequest, NextResponse } from 'next/server'
import { emergencyContactService } from '@/services/emergencyContactService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    const contacts = await emergencyContactService.getEmergencyContactsByPatient(patientId)

    return NextResponse.json({
      contacts,
      count: contacts.length
    })
  } catch (error) {
    console.error('Error fetching emergency contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.patient_id || !body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Patient ID, name, and phone are required' },
        { status: 400 }
      )
    }

    // Check if it's a batch create (array of contacts)
    if (Array.isArray(body)) {
      const contacts = await emergencyContactService.createMultipleEmergencyContacts(body)
      return NextResponse.json(contacts, { status: 201 })
    }

    // Single contact creation
    const contact = await emergencyContactService.createEmergencyContact(body)
    
    if (!contact) {
      return NextResponse.json(
        { error: 'Failed to create emergency contact' },
        { status: 500 }
      )
    }

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Error creating emergency contact:', error)
    return NextResponse.json(
      { error: 'Failed to create emergency contact' },
      { status: 500 }
    )
  }
}
