import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/debug/test-sos-system - Test SOS system functionality
export async function GET(request: NextRequest) {
  try {
    const tests = []

    // Test 1: Check if sos_requests table exists and has data
    try {
      const { data: sosRequests, error: sosError, count } = await supabase
        .from('sos_requests')
        .select('*', { count: 'exact' })
        .limit(5)

      tests.push({
        test: 'SOS Requests Table',
        status: sosError ? 'FAILED' : 'PASSED',
        error: sosError?.message,
        data: {
          count,
          sample: sosRequests?.slice(0, 2)
        }
      })
    } catch (error) {
      tests.push({
        test: 'SOS Requests Table',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Check if patients table exists and has data
    try {
      const { data: patients, error: patientsError, count } = await supabase
        .from('patients')
        .select(`
          user_id,
          blood_group,
          users!inner (
            id,
            full_name,
            email
          )
        `, { count: 'exact' })
        .limit(3)

      tests.push({
        test: 'Patients Table with Users Join',
        status: patientsError ? 'FAILED' : 'PASSED',
        error: patientsError?.message,
        data: {
          count,
          sample: patients?.slice(0, 2)
        }
      })
    } catch (error) {
      tests.push({
        test: 'Patients Table with Users Join',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Check if drivers (users with role='driver') exist
    try {
      const { data: drivers, error: driversError, count } = await supabase
        .from('users')
        .select('id, full_name, email, role', { count: 'exact' })
        .eq('role', 'driver')
        .limit(3)

      tests.push({
        test: 'Drivers (Users with role=driver)',
        status: driversError ? 'FAILED' : 'PASSED',
        error: driversError?.message,
        data: {
          count,
          sample: drivers?.slice(0, 2)
        }
      })
    } catch (error) {
      tests.push({
        test: 'Drivers (Users with role=driver)',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: Check if sos_request_assigned table exists
    try {
      const { data: assignments, error: assignError, count } = await supabase
        .from('sos_request_assigned')
        .select('*', { count: 'exact' })
        .limit(3)

      tests.push({
        test: 'SOS Request Assignments Table',
        status: assignError ? 'FAILED' : 'PASSED',
        error: assignError?.message,
        data: {
          count,
          sample: assignments?.slice(0, 2)
        }
      })
    } catch (error) {
      tests.push({
        test: 'SOS Request Assignments Table',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 5: Test complex query (same as used in API)
    try {
      const { data: complexQuery, error: complexError } = await supabase
        .from('sos_requests')
        .select(`
          id,
          patient_id,
          requested_at,
          assigned_at,
          completed_at,
          auto_assigned,
          status,
          patients!inner (
            user_id,
            blood_group,
            allergies,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relation,
            address_line,
            users!inner (
              id,
              full_name,
              email,
              phone
            )
          ),
          sos_request_assigned (
            assigned_at,
            users!inner (
              id,
              full_name,
              email,
              phone
            )
          )
        `)
        .limit(2)

      tests.push({
        test: 'Complex Query (API Format)',
        status: complexError ? 'FAILED' : 'PASSED',
        error: complexError?.message,
        data: {
          count: complexQuery?.length || 0,
          sample: complexQuery?.slice(0, 1)
        }
      })
    } catch (error) {
      tests.push({
        test: 'Complex Query (API Format)',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Summary
    const passedTests = tests.filter(t => t.status === 'PASSED').length
    const totalTests = tests.length
    const allPassed = passedTests === totalTests

    return NextResponse.json({
      success: true,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        allPassed
      },
      tests,
      message: allPassed 
        ? 'All tests passed! SOS system is ready to use.' 
        : `${passedTests}/${totalTests} tests passed. Check failed tests for issues.`,
      recommendations: allPassed ? [
        'You can now create SOS requests through the UI',
        'Test the DataTable functionality on /erteam/sos',
        'Try creating, editing, and assigning drivers to SOS requests'
      ] : [
        'Ensure the database tables are created using the provided SQL schema',
        'Make sure you have some test patients and drivers in the database',
        'Check the Supabase connection and permissions'
      ]
    })

  } catch (error) {
    console.error('Error in SOS system test:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to run SOS system tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
