import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { normalizeSOSStatus, initStatusHistory } from '@/lib/sosStatus'

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

    // NOTE: avoid PostgREST nested embeds (patients!inner / sos_request_assigned) — the FK
    // relationships are not in this DB's schema cache, so embeds 500. Fetch the scalar
    // sos_requests columns, then batch-fetch related rows and merge in JS.
    let query = supabase
      .from('sos_requests')
      .select(`
        id, patient_id, requested_at, assigned_at, completed_at, auto_assigned, status,
        location_lat, location_lon, patient_name, patient_phone,
        driver_id, driver_name, driver_phone, status_history
      `, { count: 'exact' })

    // Search on the denormalized columns we control (patient name/phone + status).
    if (search) {
      query = query.or(`patient_name.ilike.%${search}%,patient_phone.ilike.%${search}%,status.ilike.%${search}%`)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + limit - 1)

    const { data: sosRequests, error, count } = await query

    if (error) {
      console.error('Error fetching SOS requests:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SOS requests', details: error.message },
        { status: 500 }
      )
    }

    const patientIds = [...new Set((sosRequests || []).map(r => r.patient_id).filter(Boolean))]

    // Batch-fetch patient profiles, their user identity, and emergency contacts.
    const [{ data: patients }, { data: patientUsers }, { data: emergencyContacts }] = await Promise.all([
      supabase.from('patients').select('user_id, dob, gender, blood_group, allergies, abha_id, insurance_provider, insurance_policy_number, insurance_valid_till, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, latitude, longitude, address_line').in('user_id', patientIds),
      supabase.from('users').select('id, full_name, email, phone').in('id', patientIds),
      supabase.from('emergency_contacts').select('*').in('patient_id', patientIds),
    ])

    const patientById = Object.fromEntries((patients || []).map(p => [p.user_id, p]))
    const userById = Object.fromEntries((patientUsers || []).map(u => [u.id, u]))
    const contactsByPatient = (emergencyContacts || []).reduce((acc, c) => {
      (acc[c.patient_id] ||= []).push(c); return acc
    }, {} as Record<string, any[]>)

    const transformedData = (sosRequests || []).map(request => {
      const p = patientById[request.patient_id] as any
      const pu = userById[request.patient_id] as any
      return {
        id: request.id,
        patient_id: request.patient_id,
        patient_name: request.patient_name || pu?.full_name || 'Unknown',
        patient_email: pu?.email || '',
        patient_phone: request.patient_phone || pu?.phone || '',
        patient_details: {
          dob: p?.dob, gender: p?.gender, blood_group: p?.blood_group, allergies: p?.allergies, abha_id: p?.abha_id,
          insurance_provider: p?.insurance_provider, insurance_policy_number: p?.insurance_policy_number, insurance_valid_till: p?.insurance_valid_till,
          emergency_contact_name: p?.emergency_contact_name, emergency_contact_phone: p?.emergency_contact_phone, emergency_contact_relation: p?.emergency_contact_relation,
          latitude: p?.latitude, longitude: p?.longitude, address_line: p?.address_line,
          emergency_contacts: contactsByPatient[request.patient_id] || []
        },
        // Canonical inline driver model.
        assigned_driver: request.driver_id ? {
          id: request.driver_id, name: request.driver_name, email: '', phone: request.driver_phone
        } : null,
        location_lat: request.location_lat,
        location_lon: request.location_lon,
        status_history: request.status_history,
        requested_at: request.requested_at,
        assigned_at: request.assigned_at,
        completed_at: request.completed_at,
        auto_assigned: request.auto_assigned,
        status: request.status
      }
    })

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
    const {
      patient_id,
      auto_assigned = true,
      status = 'SOS Triggered',
    } = body
    // Accept location under several common keys (lat/lng, latitude/longitude, location_lat/lon).
    const location_lat = body.location_lat ?? body.latitude ?? body.lat ?? null
    const location_lon = body.location_lon ?? body.longitude ?? body.lng ?? body.lon ?? null

    // Validate required fields
    if (!patient_id) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    // Verify patient exists + pull identity (denormalized onto the request for dashboards).
    // NOTE: avoid PostgREST nested embeds — FK relationships are not in this DB's schema
    // cache, so embeds 500. Use two plain queries instead.
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('user_id, latitude, longitude')
      .eq('user_id', patient_id)
      .single()

    if (patientError || !patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    const { data: patientUser } = await supabase
      .from('users')
      .select('full_name, phone')
      .eq('id', patient_id)
      .single()

    const canonicalStatus = normalizeSOSStatus(status) ?? 'SOS Triggered'

    // Create the SOS request with full context.
    const { data: sosRequest, error: createError } = await supabase
      .from('sos_requests')
      .insert({
        patient_id,
        auto_assigned,
        status: canonicalStatus,
        requested_at: new Date().toISOString(),
        location_lat: location_lat ?? (patient as any).latitude ?? null,
        location_lon: location_lon ?? (patient as any).longitude ?? null,
        patient_name: body.patient_name ?? patientUser?.full_name ?? null,
        patient_phone: body.patient_phone ?? patientUser?.phone ?? null,
        status_history: initStatusHistory(canonicalStatus),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating SOS request:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create SOS request', details: createError.message },
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
