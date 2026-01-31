import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/debug/sos-status-values - Check what status values exist in the database
export async function GET(request: NextRequest) {
  try {
    // Get distinct status values from sos_requests table
    const { data: statusValues, error } = await supabase
      .from('sos_requests')
      .select('status')
      .not('status', 'is', null)

    if (error) {
      console.error('Error getting status values:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Get unique status values
    const uniqueStatuses = [...new Set(statusValues?.map(item => item.status) || [])]

    // Try to create a new SOS request with each possible status to see which ones work
    const testResults = []
    const possibleStatuses = [
      'SOS Triggered',
      'Driver Assigned', 
      'Driver En Route',
      'Patient Picked Up',
      'At Hospital',
      'Completed',
      'Cancelled'
    ]

    return NextResponse.json({
      success: true,
      current_status_values: uniqueStatuses,
      possible_enum_values: possibleStatuses,
      total_records: statusValues?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/debug/sos-status-values:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
