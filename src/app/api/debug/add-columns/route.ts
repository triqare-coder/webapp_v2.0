import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // Schema-bootstrap tooling that mutates the live users table — never reachable in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  try {
    console.log('Adding missing profile columns to users table...')

    // Add columns one by one to avoid issues
    const columns = [
      'date_of_birth date',
      'gender text',
      'address text',
      'city text',
      'state text',
      'zip_code text',
      'country text',
      'emergency_contact_name text',
      'emergency_contact_phone text',
      'emergency_contact_relationship text',
      'medical_conditions text',
      'allergies text',
      'medications text',
      'blood_type text',
      'insurance_provider text',
      'insurance_number text',
      'last_checkup date',
      'position text',
      'years_experience text',
      'special_certifications text',
      'languages_spoken text',
      'current_shift text',
      'license_number text',
      'license_class text',
      'license_expiry date',
      'medical_cert_expiry date',
      'vehicle_assigned text',
      'rating numeric(3,2)',
      'total_trips integer',
      'last_trip timestamp with time zone',
      'transport_company_id uuid',
      'registration_number text',
      'operating_hours text',
      'service_area text',
      'language_preference text',
      'timezone text'
    ]

    const results = []
    
    for (const column of columns) {
      try {
        const sql = `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ${column};`
        const { error } = await supabase.rpc('exec', { sql })
        
        if (error) {
          results.push({ column, error: error.message, success: false })
        } else {
          results.push({ column, success: true })
        }
      } catch (err) {
        results.push({ 
          column, 
          error: err instanceof Error ? err.message : 'Unknown error',
          success: false 
        })
      }
    }

    // Test if we can query the table with new columns
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('id, email, date_of_birth, address, medical_conditions')
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Column addition completed',
      results: results,
      successCount: results.filter(r => r.success).length,
      totalColumns: columns.length,
      testQuery: {
        success: !testError,
        error: testError?.message,
        sampleData: testUser
      }
    })

  } catch (error) {
    console.error('Error in add-columns:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
