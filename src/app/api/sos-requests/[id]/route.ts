import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SOSRequestService } from '@/services/sosRequestService'
import { normalizeSOSStatus, SOS_STATUSES } from '@/lib/sosStatus'

// GET /api/sos-requests/[id] - Get a single SOS request.
// Embed-free (PostgREST FK relationships are not in this DB's schema cache); fetch
// scalar columns + related rows separately and merge.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'SOS request ID is required' }, { status: 400 })
    }

    const { data: sosRequest, error } = await supabase
      .from('sos_requests')
      .select(`
        id, patient_id, requested_at, assigned_at, completed_at, auto_assigned, status,
        location_lat, location_lon, patient_name, patient_phone,
        driver_id, driver_name, driver_phone, status_history
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'SOS request not found' }, { status: 404 })
      }
      console.error('Error fetching SOS request:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch SOS request', details: error.message }, { status: 500 })
    }

    const [{ data: patient }, { data: patientUser }, { data: emergencyContacts }] = await Promise.all([
      supabase.from('patients').select('dob, gender, blood_group, allergies, abha_id, insurance_provider, insurance_policy_number, insurance_valid_till, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, latitude, longitude, address_line').eq('user_id', sosRequest.patient_id).maybeSingle(),
      supabase.from('users').select('full_name, email, phone').eq('id', sosRequest.patient_id).maybeSingle(),
      supabase.from('emergency_contacts').select('*').eq('patient_id', sosRequest.patient_id),
    ])
    const p = patient as any
    const pu = patientUser as any

    const transformedData = {
      id: sosRequest.id,
      patient_id: sosRequest.patient_id,
      patient_name: sosRequest.patient_name || pu?.full_name || 'Unknown',
      patient_email: pu?.email || '',
      patient_phone: sosRequest.patient_phone || pu?.phone || '',
      patient_details: {
        dob: p?.dob, gender: p?.gender, blood_group: p?.blood_group, allergies: p?.allergies, abha_id: p?.abha_id,
        insurance_provider: p?.insurance_provider, insurance_policy_number: p?.insurance_policy_number, insurance_valid_till: p?.insurance_valid_till,
        emergency_contact_name: p?.emergency_contact_name, emergency_contact_phone: p?.emergency_contact_phone, emergency_contact_relation: p?.emergency_contact_relation,
        latitude: p?.latitude, longitude: p?.longitude, address_line: p?.address_line,
        emergency_contacts: emergencyContacts || []
      },
      assigned_driver: sosRequest.driver_id ? {
        id: sosRequest.driver_id, name: sosRequest.driver_name, email: '', phone: sosRequest.driver_phone
      } : null,
      location_lat: sosRequest.location_lat,
      location_lon: sosRequest.location_lon,
      status_history: sosRequest.status_history,
      requested_at: sosRequest.requested_at,
      assigned_at: sosRequest.assigned_at,
      completed_at: sosRequest.completed_at,
      auto_assigned: sosRequest.auto_assigned,
      status: sosRequest.status
    }

    return NextResponse.json({ success: true, data: transformedData })
  } catch (error) {
    console.error('Error in GET /api/sos-requests/[id]:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/sos-requests/[id] - Update a SOS request. Status changes go through the
// service (history + timestamps + driver release); other fields update directly.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, error: 'SOS request ID is required' }, { status: 400 })
    }

    const { status, auto_assigned, completed_at } = body

    // Status transitions are owned by the service (normalize, history, release driver).
    if (status !== undefined) {
      const canonical = normalizeSOSStatus(status)
      if (!canonical) {
        return NextResponse.json(
          { success: false, error: `Invalid status value. Must map to one of: ${SOS_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      const updated = await SOSRequestService.updateStatus(id, canonical)
      return NextResponse.json({ success: true, data: updated, message: 'SOS request updated successfully' })
    }

    // Non-status field updates.
    const updateData: Record<string, unknown> = {}
    if (auto_assigned !== undefined) updateData.auto_assigned = auto_assigned
    if (completed_at !== undefined) updateData.completed_at = completed_at
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No updatable fields provided' }, { status: 400 })
    }

    const { data: updatedRequest, error } = await supabase
      .from('sos_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'SOS request not found' }, { status: 404 })
      }
      console.error('Error updating SOS request:', error)
      return NextResponse.json({ success: false, error: 'Failed to update SOS request', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedRequest, message: 'SOS request updated successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error in PUT /api/sos-requests/[id]:', message)
    return NextResponse.json({ success: false, error: message }, { status: message.includes('not found') ? 404 : 500 })
  }
}

// DELETE /api/sos-requests/[id] - Delete a SOS request (cascades assignments).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'SOS request ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('sos_requests').delete().eq('id', id)
    if (error) {
      console.error('Error deleting SOS request:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete SOS request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'SOS request deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/sos-requests/[id]:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
