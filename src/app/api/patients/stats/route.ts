import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '@/services/patientService'

// GET /api/patients/stats - Get patient statistics
export async function GET(request: NextRequest) {
  try {
    const result = await PatientService.getPatientStats()

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ stats: result.data })
  } catch (error) {
    console.error('Error in GET /api/patients/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
