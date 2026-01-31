import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing user reference schema mismatch...')

    // Step 1: Check if public.users table exists and has data
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .limit(5)

    console.log('Existing users check:', { existingUsers, usersError })

    // Step 2: Create test users if none exist or if we have schema issues
    let testUsers = existingUsers
    if (!existingUsers || existingUsers.length === 0 || usersError) {
      console.log('Creating test users...')

      const { data: newUsers, error: createUsersError } = await supabase
        .from('users')
        .upsert([
          {
            email: 'patient1@test.com',
            full_name: 'Test Patient 1',
            role: 'patient',
            is_active: true,
            clerk_user_id: 'test_patient_1'
          },
          {
            email: 'patient2@test.com',
            full_name: 'Test Patient 2',
            role: 'patient',
            is_active: true,
            clerk_user_id: 'test_patient_2'
          },
          {
            email: 'driver1@test.com',
            full_name: 'Test Driver 1',
            role: 'driver',
            is_active: true,
            clerk_user_id: 'test_driver_1'
          },
          {
            email: 'ert1@test.com',
            full_name: 'Test ERT User',
            role: 'ert',
            is_active: true,
            clerk_user_id: 'test_ert_1'
          }
        ], {
          onConflict: 'email',
          ignoreDuplicates: true
        })
        .select()

      if (createUsersError) {
        console.log('Create test users error:', createUsersError)
        testUsers = existingUsers
      } else {
        console.log('Created/updated test users:', newUsers)
        testUsers = newUsers || existingUsers

        // Create patient records for patient users
        const patientUsers = (newUsers || []).filter(u => u.role === 'patient')
        if (patientUsers.length > 0) {
          const { error: createPatientsError } = await supabase
            .from('patients')
            .upsert(
              patientUsers.map(u => ({ user_id: u.id })),
              { onConflict: 'user_id', ignoreDuplicates: true }
            )

          if (createPatientsError) {
            console.log('Create patient records error:', createPatientsError)
          } else {
            console.log('Created patient records for patient users')
          }
        }
      }
    }

    // Step 3: Test SOS creation
    const patientUsers = (testUsers || []).filter(u => u.role === 'patient')
    console.log('Available patient users for testing:', patientUsers)

    let testResult = null
    if (patientUsers && patientUsers.length > 0) {
      const testPatient = patientUsers[0]
      console.log('Testing SOS creation with patient:', testPatient)

      const { data: sosTest, error: sosTestError } = await supabase
        .from('sos_requests')
        .insert([{
          patient_id: testPatient.id,
          status: 'SOS Triggered',
          auto_assigned: true,
          requested_at: new Date().toISOString()
        }])
        .select()
        .single()

      console.log('SOS test result:', { sosTest, sosTestError })

      testResult = {
        success: !sosTestError,
        error: sosTestError?.message,
        errorCode: sosTestError?.code,
        errorDetails: sosTestError?.details,
        sosRequest: sosTest,
        testPatient: testPatient
      }

      // Clean up test SOS request
      if (sosTest) {
        await supabase
          .from('sos_requests')
          .delete()
          .eq('id', sosTest.id)
        console.log('Cleaned up test SOS request')
      }
    } else {
      testResult = {
        success: false,
        error: 'No patient users available for testing'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User reference schema fix completed',
      results: {
        usersFound: testUsers?.length || 0,
        patientUsers: patientUsers.length,
        testResult,
        instructions: testResult?.success ?
          'SOS creation test passed! The schema is now working correctly.' :
          'SOS creation still failing. You may need to run the SQL script manually in Supabase SQL Editor.'
      }
    })

  } catch (error) {
    console.error('🔧 Schema fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix user references',
      details: error instanceof Error ? error.message : 'Unknown error',
      instructions: {
        message: 'Please run the SQL script manually in Supabase SQL Editor',
        file: 'fix-user-references.sql'
      }
    })
  }
}
