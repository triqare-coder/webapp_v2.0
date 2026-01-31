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

    // Fetch SOS requests with patient details - simplified query
    let query = supabase
      .from('sos_requests')
      .select(`
        id,
        patient_id,
        requested_at,
        assigned_at,
        completed_at,
        auto_assigned,
        status
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

    // Fetch patient details
    let patientsMap: Record<string, any> = {}
    if (patientIds.length > 0) {
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          user_id,
          blood_group,
          allergies,
          emergency_contact_name,
          emergency_contact_phone,
          latitude,
          longitude,
          address_line,
          users (
            id,
            full_name,
            email,
            phone
          )
        `)
        .in('user_id', patientIds)

      console.log('Patients fetched:', patientsData?.length || 0, 'Error:', patientsError?.message || 'none')

      if (patientsData) {
        patientsData.forEach((p: any) => {
          patientsMap[p.user_id] = p
        })
      }
    }

    // Fetch driver assignments
    const sosIds = assignments.map((a: any) => a.id)
    let assignmentsMap: Record<string, any> = {}

    const { data: driverAssignments, error: assignError } = await supabase
      .from('sos_request_assigned')
      .select('id, sos_request_id, driver_id, assigned_at, status')
      .in('sos_request_id', sosIds)

    console.log('Driver assignments fetched:', driverAssignments?.length || 0, 'Error:', assignError?.message || 'none')

    if (driverAssignments) {
      driverAssignments.forEach((da: any) => {
        if (!assignmentsMap[da.sos_request_id]) {
          assignmentsMap[da.sos_request_id] = da
        }
      })
    }

    // Get all driver IDs from assignments
    const driverIds = driverAssignments?.map((da: any) => da.driver_id).filter(Boolean) || []

    // Fetch driver details if there are any assigned drivers
    let driversMap: Record<string, any> = {}
    if (driverIds.length > 0) {
      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone,
          drivers (
            license_number,
            vehicle_number,
            transport_company_id,
            transport_companies (
              company_name
            )
          )
        `)
        .in('id', driverIds)

      console.log('Drivers fetched:', driversData?.length || 0, 'Error:', driversError?.message || 'none')

      if (driversData) {
        driversData.forEach((d: any) => {
          driversMap[d.id] = d
        })
      }
    }

    // Transform data for frontend
    const transformedAssignments = assignments.map((assignment: any) => {
      const patient = patientsMap[assignment.patient_id]
      const patientUser = patient?.users
      const driverAssignment = assignmentsMap[assignment.id]
      const driverId = driverAssignment?.driver_id
      const driver = driverId ? driversMap[driverId] : null
      const driverDetails = driver?.drivers?.[0]

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
        assignedDriver: driver?.full_name || null,
        driverPhone: driver?.phone || null,
        driverEmail: driver?.email || null,
        vehicleNumber: driverDetails?.vehicle_number || null,
        licenseNumber: driverDetails?.license_number || null,
        companyName: driverDetails?.transport_companies?.company_name || null,
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

