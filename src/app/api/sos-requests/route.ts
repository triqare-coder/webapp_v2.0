import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sos-requests - Get all SOS requests with patient details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'requested_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build the query with joins to get patient and driver details
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
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`
        patients.users.full_name.ilike.%${search}%,
        patients.users.email.ilike.%${search}%,
        patients.users.phone.ilike.%${search}%,
        patients.address_line.ilike.%${search}%,
        status.ilike.%${search}%
      `)
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: sosRequests, error, count } = await query

    if (error) {
      console.error('Error fetching SOS requests:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SOS requests' },
        { status: 500 }
      )
    }

    // Get emergency contacts for all patients in the results
    const patientIds = sosRequests?.map(request => request.patient_id) || []
    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .in('patient_id', patientIds)

    // Group emergency contacts by patient_id
    const emergencyContactsByPatient = emergencyContacts?.reduce((acc, contact) => {
      if (!acc[contact.patient_id]) {
        acc[contact.patient_id] = []
      }
      acc[contact.patient_id].push(contact)
      return acc
    }, {} as Record<string, any[]>) || {}

    // Transform the data for frontend consumption
    const transformedData = sosRequests?.map(request => ({
      id: request.id,
      patient_id: request.patient_id,
      patient_name: (request.patients as any)?.users?.full_name || 'Unknown',
      patient_email: (request.patients as any)?.users?.email || '',
      patient_phone: (request.patients as any)?.users?.phone || '',
      patient_details: {
        dob: (request.patients as any)?.dob,
        gender: (request.patients as any)?.gender,
        blood_group: (request.patients as any)?.blood_group,
        allergies: (request.patients as any)?.allergies,
        abha_id: (request.patients as any)?.abha_id,
        insurance_provider: (request.patients as any)?.insurance_provider,
        insurance_policy_number: (request.patients as any)?.insurance_policy_number,
        insurance_valid_till: (request.patients as any)?.insurance_valid_till,
        emergency_contact_name: (request.patients as any)?.emergency_contact_name,
        emergency_contact_phone: (request.patients as any)?.emergency_contact_phone,
        emergency_contact_relation: (request.patients as any)?.emergency_contact_relation,
        latitude: (request.patients as any)?.latitude,
        longitude: (request.patients as any)?.longitude,
        address_line: (request.patients as any)?.address_line,
        emergency_contacts: emergencyContactsByPatient[request.patient_id] || []
      },
      assigned_driver: request.sos_request_assigned?.[0]?.users ? {
        id: (request.sos_request_assigned[0].users as any).id,
        name: (request.sos_request_assigned[0].users as any).full_name,
        email: (request.sos_request_assigned[0].users as any).email,
        phone: (request.sos_request_assigned[0].users as any).phone
      } : null,
      requested_at: request.requested_at,
      assigned_at: request.assigned_at || request.sos_request_assigned?.[0]?.assigned_at,
      completed_at: request.completed_at,
      auto_assigned: request.auto_assigned,
      status: request.status
    })) || []



    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/sos-requests:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sos-requests - Create a new SOS request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patient_id, auto_assigned = true, status = 'SOS Triggered' } = body

    // Validate required fields
    if (!patient_id) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    // Verify patient exists
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('user_id', patient_id)
      .single()

    if (patientError || !patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Create the SOS request
    const { data: sosRequest, error: createError } = await supabase
      .from('sos_requests')
      .insert({
        patient_id,
        auto_assigned,
        status,
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating SOS request:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create SOS request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sosRequest,
      message: 'SOS request created successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/sos-requests:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
