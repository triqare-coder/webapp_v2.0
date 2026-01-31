import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sos-requests/[id] - Get a single SOS request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID is required' },
        { status: 400 }
      )
    }

    const { data: sosRequest, error } = await supabase
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
          latitude,
          longitude,
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
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'SOS request not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching SOS request:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SOS request' },
        { status: 500 }
      )
    }

    // Get emergency contacts for this patient
    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('patient_id', sosRequest.patient_id)

    // Transform the data
    const transformedData = {
      id: sosRequest.id,
      patient_id: sosRequest.patient_id,
      patient_name: (sosRequest.patients as any)?.users?.full_name || 'Unknown',
      patient_email: (sosRequest.patients as any)?.users?.email || '',
      patient_phone: (sosRequest.patients as any)?.users?.phone || '',
      patient_details: {
        dob: (sosRequest.patients as any)?.dob,
        gender: (sosRequest.patients as any)?.gender,
        blood_group: (sosRequest.patients as any)?.blood_group,
        allergies: (sosRequest.patients as any)?.allergies,
        abha_id: (sosRequest.patients as any)?.abha_id,
        insurance_provider: (sosRequest.patients as any)?.insurance_provider,
        insurance_policy_number: (sosRequest.patients as any)?.insurance_policy_number,
        insurance_valid_till: (sosRequest.patients as any)?.insurance_valid_till,
        emergency_contact_name: (sosRequest.patients as any)?.emergency_contact_name,
        emergency_contact_phone: (sosRequest.patients as any)?.emergency_contact_phone,
        emergency_contact_relation: (sosRequest.patients as any)?.emergency_contact_relation,
        latitude: (sosRequest.patients as any)?.latitude,
        longitude: (sosRequest.patients as any)?.longitude,
        address_line: (sosRequest.patients as any)?.address_line,
        emergency_contacts: emergencyContacts || []
      },
      assigned_driver: sosRequest.sos_request_assigned?.[0]?.users ? {
        id: (sosRequest.sos_request_assigned[0].users as any).id,
        name: (sosRequest.sos_request_assigned[0].users as any).full_name,
        email: (sosRequest.sos_request_assigned[0].users as any).email,
        phone: (sosRequest.sos_request_assigned[0].users as any).phone
      } : null,
      requested_at: sosRequest.requested_at,
      assigned_at: sosRequest.assigned_at || sosRequest.sos_request_assigned?.[0]?.assigned_at,
      completed_at: sosRequest.completed_at,
      auto_assigned: sosRequest.auto_assigned,
      status: sosRequest.status
    }

    return NextResponse.json({
      success: true,
      data: transformedData
    })

  } catch (error) {
    console.error('Error in GET /api/sos-requests/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sos-requests/[id] - Update a SOS request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID is required' },
        { status: 400 }
      )
    }

    // Extract updateable fields
    const { status, auto_assigned, completed_at } = body
    const updateData: any = {}

    if (status !== undefined) {
      // Validate status
      const validStatuses = ['SOS Triggered', 'Driver En Route', 'Transport Arrived', 'User Picked Up', 'Arrived at Hospital', 'Cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status value' },
          { status: 400 }
        )
      }
      updateData.status = status

      // Auto-set completed_at when status is Arrived at Hospital
      if (status === 'Arrived at Hospital' && !completed_at) {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (auto_assigned !== undefined) {
      updateData.auto_assigned = auto_assigned
    }

    if (completed_at !== undefined) {
      updateData.completed_at = completed_at
    }

    // Update the SOS request
    const { data: updatedRequest, error } = await supabase
      .from('sos_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'SOS request not found' },
          { status: 404 }
        )
      }
      console.error('Error updating SOS request:', error)
      console.error('Update data was:', updateData)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { success: false, error: 'Failed to update SOS request', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'SOS request updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/sos-requests/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sos-requests/[id] - Delete a SOS request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'SOS request ID is required' },
        { status: 400 }
      )
    }

    // Delete the SOS request (this will cascade delete assignments)
    const { error } = await supabase
      .from('sos_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting SOS request:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete SOS request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SOS request deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/sos-requests/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
