import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { UserService } from '@/services/userService'
import { supabase } from '@/lib/supabase'

// GET /api/transport/sos-requests - Get SOS requests assigned to the transport company's drivers
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters first
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('test') === 'true'

    let currentUser: any = null

    if (testMode) {
      // Use test transport company user
      const { data: testUser, error: testError } = await UserService.getUserByEmail('transport.test@example.com')
      if (testError || !testUser) {
        return NextResponse.json({ error: 'Test user not found' }, { status: 404 })
      }
      currentUser = testUser
    } else {
      const { userId } = await auth()

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get current user to verify they are a transport company user
      const { data: user, error: userError } = await UserService.getUserByClerkId(userId)

      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      if (user.role !== 'transport_company') {
        return NextResponse.json({ error: 'Forbidden - Transport company access required' }, { status: 403 })
      }

      currentUser = user
    }

    // Parse additional query parameters
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Get SOS requests assigned to drivers from this transport company
    let query = supabase
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
          dob,
          gender,
          blood_group,
          allergies,
          abha_id,
          insurance_provider,
          insurance_policy_number,
          insurance_valid_till,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relation,
          latitude,
          longitude,
          address_line,
          users!inner (
            id,
            full_name,
            email,
            phone,
            first_name,
            last_name
          )
        ),
        sos_request_assigned!inner (
          assigned_at,
          users!inner (
            id,
            full_name,
            email,
            phone,
            drivers!inner (
              transport_company_id,
              transport_companies!inner (
                user_id
              )
            )
          )
        )
      `)
      .eq('sos_request_assigned.users.drivers.transport_companies.user_id', currentUser.id)
      .order('requested_at', { ascending: false })

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching transport company SOS requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SOS requests' },
        { status: 500 }
      )
    }

    // Transform the data to match the expected format
    const transformedData = data?.map((request: any) => ({
      id: request.id,
      patient_id: request.patient_id,
      patient_name: request.patients?.users?.full_name || 'Unknown Patient',
      patient_email: request.patients?.users?.email || '',
      patient_phone: request.patients?.users?.phone || '',
      patient_details: {
        dob: request.patients?.dob,
        gender: request.patients?.gender,
        blood_group: request.patients?.blood_group,
        allergies: request.patients?.allergies,
        abha_id: request.patients?.abha_id,
        insurance_provider: request.patients?.insurance_provider,
        insurance_policy_number: request.patients?.insurance_policy_number,
        insurance_valid_till: request.patients?.insurance_valid_till,
        emergency_contact_name: request.patients?.emergency_contact_name,
        emergency_contact_phone: request.patients?.emergency_contact_phone,
        emergency_contact_relation: request.patients?.emergency_contact_relation,
        latitude: request.patients?.latitude,
        longitude: request.patients?.longitude,
        address_line: request.patients?.address_line,
        emergency_contacts: []
      },
      assigned_driver: request.sos_request_assigned?.[0] ? {
        id: request.sos_request_assigned[0].users?.id,
        name: request.sos_request_assigned[0].users?.full_name,
        email: request.sos_request_assigned[0].users?.email,
        phone: request.sos_request_assigned[0].users?.phone
      } : null,
      requested_at: request.requested_at,
      assigned_at: request.assigned_at,
      completed_at: request.completed_at,
      auto_assigned: request.auto_assigned,
      status: request.status
    })) || []

    return NextResponse.json({
      requests: transformedData,
      count: count || 0,
      success: true
    })
  } catch (error) {
    console.error('Error fetching transport company SOS requests:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch SOS requests',
        success: false 
      },
      { status: 500 }
    )
  }
}
