import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/sos-requests/assign-driver - Assign a driver to a SOS request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sos_request_id, driver_id } = body

    // Validate required fields
    if (!sos_request_id || !driver_id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID and driver ID are required' },
        { status: 400 }
      )
    }

    // Verify SOS request exists and is not completed
    const { data: sosRequest, error: sosError } = await supabase
      .from('sos_requests')
      .select('id, status')
      .eq('id', sos_request_id)
      .single()

    if (sosError || !sosRequest) {
      return NextResponse.json(
        { success: false, error: 'SOS request not found' },
        { status: 404 }
      )
    }

    if (sosRequest.status === 'Completed' || sosRequest.status === 'Cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot assign driver to completed or cancelled SOS request' },
        { status: 400 }
      )
    }

    // Verify driver exists and is available
    const { data: driver, error: driverError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', driver_id)
      .eq('role', 'driver')
      .single()

    if (driverError || !driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found or invalid role' },
        { status: 404 }
      )
    }

    // Check if driver is already assigned to another active SOS request
    // First get all assignments for this driver
    const { data: driverAssignments, error: assignmentError } = await supabase
      .from('sos_request_assigned')
      .select('sos_request_id')
      .eq('driver_id', driver_id)

    if (assignmentError) {
      console.error('Error checking driver assignments:', assignmentError)
      console.error('Assignment error details:', JSON.stringify(assignmentError, null, 2))
      return NextResponse.json(
        { success: false, error: 'Failed to check driver availability', details: assignmentError.message },
        { status: 500 }
      )
    }

    console.log('Driver assignments found:', driverAssignments)

    // If driver has assignments, check if any are for active SOS requests
    let existingAssignment = null
    if (driverAssignments && driverAssignments.length > 0) {
      const sosRequestIds = driverAssignments.map(a => a.sos_request_id)

      const { data: activeSosRequests, error: sosError } = await supabase
        .from('sos_requests')
        .select('id, status')
        .in('id', sosRequestIds)
        .in('status', ['SOS Triggered', 'Driver Assigned', 'Driver En Route', 'Patient Picked Up', 'At Hospital'])

      if (sosError) {
        console.error('Error checking active SOS requests:', sosError)
        return NextResponse.json(
          { success: false, error: 'Failed to check driver availability' },
          { status: 500 }
        )
      }

      existingAssignment = activeSosRequests
    }

    if (existingAssignment && existingAssignment.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Driver is already assigned to another active SOS request' },
        { status: 400 }
      )
    }

    // Check if SOS request already has a driver assigned
    const { data: currentAssignment } = await supabase
      .from('sos_request_assigned')
      .select('id')
      .eq('sos_request_id', sos_request_id)

    if (currentAssignment && currentAssignment.length > 0) {
      // Update existing assignment
      const { error: updateError } = await supabase
        .from('sos_request_assigned')
        .update({
          driver_id,
          assigned_at: new Date().toISOString()
        })
        .eq('sos_request_id', sos_request_id)

      if (updateError) {
        console.error('Error updating driver assignment:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update driver assignment' },
          { status: 500 }
        )
      }
    } else {
      // Create new assignment
      const { error: insertError } = await supabase
        .from('sos_request_assigned')
        .insert({
          sos_request_id,
          driver_id,
          assigned_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error creating driver assignment:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to assign driver' },
          { status: 500 }
        )
      }
    }

    // Update SOS request status and assigned_at timestamp
    const { data: statusUpdate, error: statusUpdateError } = await supabase
      .from('sos_requests')
      .update({
        status: 'Driver Assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', sos_request_id)
      .select('id, status, assigned_at')
      .single()

    if (statusUpdateError) {
      console.error('Error updating SOS request status:', statusUpdateError)
      console.error('Status update error details:', JSON.stringify(statusUpdateError, null, 2))
      // Don't return error here as assignment was successful
    } else {
      console.log('SOS request status updated successfully:', statusUpdate)
    }

    return NextResponse.json({
      success: true,
      message: 'Driver assigned successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/sos-requests/assign-driver:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sos-requests/assign-driver - Remove driver assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sos_request_id = searchParams.get('sos_request_id')

    if (!sos_request_id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID is required' },
        { status: 400 }
      )
    }

    // Remove the assignment
    const { error: deleteError } = await supabase
      .from('sos_request_assigned')
      .delete()
      .eq('sos_request_id', sos_request_id)

    if (deleteError) {
      console.error('Error removing driver assignment:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove driver assignment' },
        { status: 500 }
      )
    }

    // Update SOS request status back to triggered
    const { error: statusUpdateError } = await supabase
      .from('sos_requests')
      .update({
        status: 'SOS Triggered',
        assigned_at: null
      })
      .eq('id', sos_request_id)

    if (statusUpdateError) {
      console.error('Error updating SOS request status:', statusUpdateError)
      // Don't return error here as removal was successful
    }

    return NextResponse.json({
      success: true,
      message: 'Driver assignment removed successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/sos-requests/assign-driver:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
