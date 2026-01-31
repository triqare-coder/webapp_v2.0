import { NextRequest, NextResponse } from 'next/server'
import { SOSService } from '@/services/sosService'

// GET /api/sos - Get all SOS requests
export async function GET() {
  try {
    const { data, error } = await SOSService.getSOSRequests()
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/sos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sos - Create new SOS request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patient_id } = body

    if (!patient_id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await SOSService.createSOSRequest(patient_id)
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/sos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
