import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/debug/test-rpc - Test the update_sos_request_status RPC function
export async function GET(request: NextRequest) {
  try {
    // Test the RPC function directly
    const { data, error } = await supabase
      .rpc('update_sos_request_status', {
        request_id: 'ada3c7c4-a2e5-4e6c-a106-66b95a2711d3',
        new_status: 'Driver Assigned',
        assigned_timestamp: new Date().toISOString()
      })

    if (error) {
      console.error('RPC function error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'RPC function executed successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/debug/test-rpc:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
