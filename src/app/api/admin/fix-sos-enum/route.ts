import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// POST /api/admin/fix-sos-enum - Fix the SOS status enum by adding missing values
// SECURITY: this endpoint MUTATES a live sos_requests row (writes each candidate
// status then restores the original). It must never be reachable unauthenticated
// on a live emergency system: blocked in production and admin-only otherwise.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    console.log('Starting SOS enum fix...')

    // Since we can't execute raw SQL directly, let's try a different approach
    // We'll attempt to update a record with each enum value to see which ones work

    const requiredEnumValues = [
      'SOS Triggered',
      'Driver En Route',
      'Transport Arrived',
      'User Picked Up',
      'Arrived at Hospital',
      'Cancelled'
    ]

    // Get a test SOS request ID
    const { data: testSOS, error: testSOSError } = await supabase
      .from('sos_requests')
      .select('id, status')
      .limit(1)
      .single()

    if (testSOSError || !testSOS) {
      return NextResponse.json({
        success: false,
        error: 'No SOS requests found to test with',
        details: testSOSError?.message
      })
    }

    const originalStatus = testSOS.status
    console.log(`Testing with SOS request ${testSOS.id}, original status: ${originalStatus}`)

    // Test each enum value
    const results = []
    for (const enumValue of requiredEnumValues) {
      try {
        const { data, error } = await supabase
          .from('sos_requests')
          .update({ status: enumValue })
          .eq('id', testSOS.id)
          .select('id, status')
          .single()

        if (error) {
          console.log(`Enum value "${enumValue}" failed:`, error.message)
          results.push({
            value: enumValue,
            success: false,
            error: error.message
          })
        } else {
          console.log(`Enum value "${enumValue}" works!`)
          results.push({
            value: enumValue,
            success: true,
            updated_to: data.status
          })
        }
      } catch (err) {
        console.log(`Exception testing enum value "${enumValue}":`, err)
        results.push({
          value: enumValue,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Restore original status
    await supabase
      .from('sos_requests')
      .update({ status: originalStatus })
      .eq('id', testSOS.id)

    const workingValues = results.filter(r => r.success).map(r => r.value)
    const failingValues = results.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      message: 'SOS enum testing completed',
      test_results: results,
      working_enum_values: workingValues,
      failing_enum_values: failingValues.map(f => ({ value: f.value, error: f.error })),
      required_values: requiredEnumValues,
      test_sos_id: testSOS.id,
      original_status: originalStatus
    })

  } catch (error) {
    console.error('Error in POST /api/admin/fix-sos-enum:', error)
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
