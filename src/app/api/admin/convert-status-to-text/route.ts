import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/admin/convert-status-to-text - Convert SOS status from enum to text
export async function POST(request: NextRequest) {
  try {
    console.log('Starting status column conversion from enum to text...')

    // Step 1: Add a new text column
    console.log('Step 1: Adding status_text column...')
    const { error: addColumnError } = await supabase
      .rpc('execute_sql', {
        sql: 'ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS status_text TEXT;'
      })

    if (addColumnError) {
      console.log('execute_sql not available, trying alternative approach')
      
      // Alternative: Try to add the column by attempting an update
      const { error: altError } = await supabase
        .from('sos_requests')
        .update({ status_text: 'SOS Triggered' })
        .eq('id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
      
      // This will fail but might give us info about the column
      console.log('Alternative approach result:', altError?.message)
    }

    // Step 2: Copy existing status values to the new column
    console.log('Step 2: Copying status values...')
    const { data: allRequests, error: selectError } = await supabase
      .from('sos_requests')
      .select('id, status')

    if (selectError) {
      console.error('Error selecting SOS requests:', selectError)
      return NextResponse.json({
        success: false,
        error: 'Failed to read SOS requests',
        details: selectError.message
      })
    }

    console.log(`Found ${allRequests?.length || 0} SOS requests to update`)

    // Since we can't execute raw SQL, let's try a different approach
    // Let's check if we can update the status directly with text values
    const testResults = []
    
    if (allRequests && allRequests.length > 0) {
      const testRequest = allRequests[0]
      
      // Try updating with different status values to see which work
      const statusesToTest = [
        'SOS Triggered',
        'Driver Assigned',
        'Driver En Route',
        'Patient Picked Up',
        'At Hospital',
        'Completed',
        'Cancelled'
      ]

      for (const status of statusesToTest) {
        try {
          const { data, error } = await supabase
            .from('sos_requests')
            .update({ status: status })
            .eq('id', testRequest.id)
            .select('id, status')
            .single()

          if (error) {
            testResults.push({
              status: status,
              success: false,
              error: error.message
            })
          } else {
            testResults.push({
              status: status,
              success: true,
              result: data.status
            })
          }
        } catch (err) {
          testResults.push({
            status: status,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      // Restore original status
      await supabase
        .from('sos_requests')
        .update({ status: testRequest.status })
        .eq('id', testRequest.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Status conversion analysis completed',
      total_requests: allRequests?.length || 0,
      test_results: testResults,
      working_statuses: testResults.filter(r => r.success).map(r => r.status),
      failing_statuses: testResults.filter(r => !r.success).map(r => ({ status: r.status, error: r.error }))
    })

  } catch (error) {
    console.error('Error in POST /api/admin/convert-status-to-text:', error)
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
