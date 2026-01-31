import { NextResponse } from 'next/server'
import { SOSService } from '@/services/sosService'

// GET /api/sos/patients - Get all patients for SOS creation
export async function GET() {
  try {
    const { data, error } = await SOSService.getPatients()
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/sos/patients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
