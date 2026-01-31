import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Try to get a sample record to see the structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('drivers')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error('Error getting sample data:', sampleError)
      return NextResponse.json({ error: sampleError.message }, { status: 500 })
    }

    // Get the column names from the sample data
    const columns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []

    // Also try to insert a test record to see what columns are expected
    const testData = {
      user_id: 'test-id',
      transport_company_id: 'test-company-id',
      license_number: 'TEST-LICENSE-123'
    }

    const { error: insertError } = await supabase
      .from('drivers')
      .insert([testData])
      .select()

    return NextResponse.json({
      success: true,
      table: 'drivers',
      existingColumns: columns,
      sampleRecord: sampleData?.[0] || null,
      insertTestError: insertError?.message || 'No error - insert would work',
      insertTestDetails: insertError?.details || null
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
