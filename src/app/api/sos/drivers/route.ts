import { NextResponse } from 'next/server'
import { SOSService } from '@/services/sosService'

// GET /api/sos/drivers - Get all drivers for assignment
export async function GET() {
  try {
    const { data, error } = await SOSService.getDrivers()
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/sos/drivers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
