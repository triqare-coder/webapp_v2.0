import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/erteam/assignments - Get all SOS assignments for ERT team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const priority = searchParams.get('priority') || 'all'

    console.log('Fetching SOS assignments...')

    // Fetch SOS requests with the canonical inline driver model. The assigned driver
    // is denormalized on sos_requests (driver_id/driver_name/driver_phone) — the legacy
    // sos_request_assigned junction is NOT used here (it has no status column and misses
    // drivers assigned via the canonical dispatch flow).
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
        driver_id,
        driver_name,
        driver_phone
      `)
      .order('requested_at', { ascending: false })

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: assignments, error } = await query

    console.log('SOS requests fetched:', assignments?.length || 0, 'Error:', error?.message || 'none')

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // If no assignments, return empty
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        stats: { total: 0, active: 0, highPriority: 0, completed: 0, cancelled: 0 },
        count: 0
      })
    }

    // Get patient IDs
    const patientIds = assignments.map((a: any) => a.patient_id).filter(Boolean)
    console.log('Patient IDs:', patientIds)

    // Fetch patient details. NOTE: avoid PostgREST nested embeds (users(...) — FK not in
    // schema cache → embeds 500); fetch patient profiles + their user identity separately
    // and merge in JS.
    let patientsMap: Record<string, any> = {}
    let patientUsersMap: Record<string, any> = {}
    if (patientIds.length > 0) {
      const [{ data: patientsData, error: patientsError }, { data: patientUsersData }] = await Promise.all([
        supabase
          .from('patients')
          .select('user_id, blood_group, allergies, emergency_contact_name, emergency_contact_phone, latitude, longitude, address_line')
          .in('user_id', patientIds),
        supabase
          .from('users')
          .select('id, full_name, email, phone')
          .in('id', patientIds),
      ])

      console.log('Patients fetched:', patientsData?.length || 0, 'Error:', patientsError?.message || 'none')

      if (patientsData) {
        patientsData.forEach((p: any) => { patientsMap[p.user_id] = p })
      }
      if (patientUsersData) {
        patientUsersData.forEach((u: any) => { patientUsersMap[u.id] = u })
      }
    }

    // Resolve assigned drivers from the canonical inline model (sos_requests.driver_id).
    const driverIds = [...new Set(assignments.map((a: any) => a.driver_id).filter(Boolean))]

    // Fetch driver profile details (license/vehicle/company) for assigned drivers. Embeds
    // are broken DB-wide, so fetch drivers + their transport company separately and merge.
    let driversMap: Record<string, any> = {}
    let companyNameById: Record<string, string> = {}
    if (driverIds.length > 0) {
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('user_id, license_number, vehicle_number, transport_company_id')
        .in('user_id', driverIds)

      console.log('Drivers fetched:', driversData?.length || 0, 'Error:', driversError?.message || 'none')

      if (driversData) {
        driversData.forEach((d: any) => { driversMap[d.user_id] = d })
        const companyIds = [...new Set(driversData.map((d: any) => d.transport_company_id).filter(Boolean))]
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('transport_companies')
            .select('user_id, company_name')
            .in('user_id', companyIds)
          companies?.forEach((c: any) => { companyNameById[c.user_id] = c.company_name })
        }
      }
    }

    // Transform data for frontend
    const transformedAssignments = assignments.map((assignment: any) => {
      const patient = patientsMap[assignment.patient_id]
      const patientUser = patientUsersMap[assignment.patient_id]
      const driverId = assignment.driver_id
      const driverDetails = driverId ? driversMap[driverId] : null

      // Determine priority based on status and time
      let priority: 'high' | 'medium' | 'low' = 'medium'
      if (['SOS Triggered', 'Driver Assigned'].includes(assignment.status)) {
        priority = 'high'
      } else if (assignment.status === 'Completed') {
        priority = 'low'
      }

      return {
        id: assignment.id,
        caseId: `SOS-${assignment.id.slice(0, 8).toUpperCase()}`,
        priority,
        status: assignment.status,
        patientName: patientUser?.full_name || 'Unknown Patient',
        patientEmail: patientUser?.email || '',
        patientPhone: patientUser?.phone || '',
        location: patient?.address_line || 'Location not specified',
        latitude: patient?.latitude,
        longitude: patient?.longitude,
        bloodGroup: patient?.blood_group,
        allergies: patient?.allergies,
        emergencyContactName: patient?.emergency_contact_name,
        emergencyContactPhone: patient?.emergency_contact_phone,
        assignedDriver: assignment.driver_name || null,
        driverPhone: assignment.driver_phone || null,
        driverEmail: null,
        vehicleNumber: driverDetails?.vehicle_number || null,
        licenseNumber: driverDetails?.license_number || null,
        companyName: driverDetails?.transport_company_id ? (companyNameById[driverDetails.transport_company_id] || null) : null,
        requestedAt: assignment.requested_at,
        assignedAt: assignment.assigned_at,
        completedAt: assignment.completed_at,
        autoAssigned: assignment.auto_assigned
      }
    })

    // Apply search filter on transformed data
    let filteredAssignments = transformedAssignments
    if (search) {
      const searchLower = search.toLowerCase()
      filteredAssignments = transformedAssignments.filter((a: any) =>
        a.patientName.toLowerCase().includes(searchLower) ||
        a.caseId.toLowerCase().includes(searchLower) ||
        a.location.toLowerCase().includes(searchLower) ||
        (a.assignedDriver && a.assignedDriver.toLowerCase().includes(searchLower))
      )
    }

    // Apply priority filter
    if (priority !== 'all') {
      filteredAssignments = filteredAssignments.filter((a: any) => a.priority === priority)
    }

    // Calculate stats
    const activeStatuses = ['SOS Triggered', 'Driver Assigned', 'Driver En Route', 'Patient Picked Up', 'At Hospital']
    const stats = {
      total: transformedAssignments.length,
      active: transformedAssignments.filter((a: any) => activeStatuses.includes(a.status)).length,
      highPriority: transformedAssignments.filter((a: any) => a.priority === 'high' && activeStatuses.includes(a.status)).length,
      completed: transformedAssignments.filter((a: any) => a.status === 'Completed').length,
      cancelled: transformedAssignments.filter((a: any) => a.status === 'Cancelled').length
    }

    return NextResponse.json({
      success: true,
      data: filteredAssignments,
      stats,
      count: filteredAssignments.length
    })

  } catch (error) {
    console.error('Error in assignments API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

