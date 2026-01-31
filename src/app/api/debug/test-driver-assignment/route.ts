import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SOSService } from '@/services/sosService'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing driver assignment...')

    // Step 1: Get available drivers
    const { data: drivers, error: driversError } = await SOSService.getAvailableDrivers()
    
    if (driversError || !drivers || drivers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No available drivers found',
        details: driversError,
        suggestion: 'Create driver users first'
      })
    }

    console.log('Available drivers:', drivers)

    // Step 2: Get or create a test SOS request
    let { data: sosRequests, error: sosError } = await supabase
      .from('sos_requests')
      .select('id, status, patient_id')
      .eq('status', 'SOS Triggered')
      .limit(1)

    let testSOS = sosRequests?.[0]

    if (!testSOS) {
      // Create a test SOS request
      const { data: patients } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'patient')
        .eq('is_active', true)
        .limit(1)

      if (!patients || patients.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No patients found to create test SOS',
          suggestion: 'Create patient users first'
        })
      }

      const { data: newSOS, error: createSOSError } = await supabase
        .from('sos_requests')
        .insert([{
          patient_id: patients[0].id,
          status: 'SOS Triggered',
          auto_assigned: true,
          requested_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createSOSError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create test SOS request',
          details: createSOSError
        })
      }

      testSOS = newSOS
    }

    console.log('Test SOS request:', testSOS)

    if (!testSOS) {
      return NextResponse.json({
        error: 'No test SOS request found'
      }, { status: 404 })
    }

    // Step 3: Test driver assignment
    const testDriver = drivers[0]
    console.log('Testing assignment with driver:', testDriver)

    const assignmentResult = await SOSService.assignDriver(testSOS.id, testDriver.id)

    // Step 4: Clean up - remove the assignment
    if (assignmentResult.success) {
      await supabase
        .from('sos_requests')
        .update({
          driver_id: null,
          assigned_at: null,
          status: 'SOS Triggered'
        })
        .eq('id', testSOS.id)
      
      console.log('Cleaned up test assignment')
    }

    return NextResponse.json({
      success: assignmentResult.success,
      message: assignmentResult.success ? 
        'Driver assignment test PASSED!' : 
        'Driver assignment test FAILED',
      results: {
        driversAvailable: drivers.length,
        testDriver: {
          id: testDriver.id,
          name: testDriver.full_name,
          email: testDriver.email
        },
        testSOS: {
          id: testSOS.id,
          status: testSOS.status,
          patient_id: testSOS.patient_id
        },
        assignmentResult: assignmentResult
      }
    })

  } catch (error) {
    console.error('🧪 Driver assignment test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during driver assignment test',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
