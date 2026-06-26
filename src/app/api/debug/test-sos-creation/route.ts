import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // Test tooling that writes live rows — never reachable in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  try {
    console.log('🧪 Testing SOS creation...')

    // First, get a test patient
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('role', 'patient')
      .eq('is_active', true)
      .limit(1)

    if (usersError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to find test patient',
        details: usersError
      })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No patients found in database',
        suggestion: 'Create a patient user first'
      })
    }

    const testPatient = users[0]
    console.log('🧪 Using test patient:', testPatient)

    // Check if patient record exists
    const { data: patientRecord, error: patientCheckError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('user_id', testPatient.id)
      .single()

    console.log('🧪 Patient record check:', { patientRecord, patientCheckError })

    // Create patient record if it doesn't exist
    if (!patientRecord && patientCheckError?.code === 'PGRST116') {
      console.log('🧪 Creating patient record...')
      const { error: createPatientError } = await supabase
        .from('patients')
        .insert([{
          user_id: testPatient.id
        }])

      if (createPatientError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create patient record',
          details: createPatientError
        })
      }
      console.log('✅ Created patient record')
    }

    // Now try to create SOS request
    console.log('🧪 Creating SOS request...')
    const { data: sosRequest, error: sosError } = await supabase
      .from('sos_requests')
      .insert([{
        patient_id: testPatient.id,
        status: 'SOS Triggered',
        auto_assigned: true,
        requested_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (sosError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create SOS request',
        details: sosError,
        errorCode: sosError.code,
        errorMessage: sosError.message,
        testPatient: testPatient
      })
    }

    return NextResponse.json({
      success: true,
      message: 'SOS request created successfully',
      sosRequest: sosRequest,
      testPatient: testPatient
    })

  } catch (error) {
    console.error('🧪 Test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during test',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
