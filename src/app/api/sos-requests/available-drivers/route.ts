import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sos-requests/available-drivers - Get available drivers for SOS assignment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'available'

    // Build query to get users with role 'driver'
    let query = supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        first_name,
        last_name,
        employee_id,
        created_at,
        is_active
      `)
      .eq('role', 'driver')
      .eq('is_active', true)
      .limit(limit)

    // Apply search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,employee_id.ilike.%${search}%`)
    }

    // Order by name for consistent results
    query = query.order('full_name', { ascending: true })

    const { data: drivers, error } = await query

    if (error) {
      console.error('Error fetching available drivers:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch available drivers' },
        { status: 500 }
      )
    }

    // Get currently assigned drivers to filter them out if status is 'available'
    let assignedDriverIds: string[] = []
    if (status === 'available') {
      // Get all assignments and check if the associated SOS requests are still active
      const { data: assignments } = await supabase
        .from('sos_request_assigned')
        .select(`
          driver_id,
          sos_requests!inner (
            id,
            status
          )
        `)

      if (assignments && assignments.length > 0) {
        // Filter assignments where SOS request is not completed or cancelled
        assignedDriverIds = assignments
          .filter(assignment => {
            const sosRequest = assignment.sos_requests as any
            return sosRequest.status !== 'Completed' && sosRequest.status !== 'Cancelled'
          })
          .map(assignment => assignment.driver_id)
      }
    }

    // Filter out assigned drivers if looking for available ones
    const availableDrivers = status === 'available' 
      ? drivers?.filter(driver => !assignedDriverIds.includes(driver.id)) || []
      : drivers || []

    // Transform data to match expected format
    const transformedDrivers = availableDrivers.map(driver => ({
      id: driver.id,
      full_name: driver.full_name,
      email: driver.email,
      phone: driver.phone,
      employee_id: driver.employee_id,
      first_name: driver.first_name,
      last_name: driver.last_name,
      status: assignedDriverIds.includes(driver.id) ? 'assigned' : 'available',
      created_at: driver.created_at,
      is_active: driver.is_active
    }))

    return NextResponse.json({
      success: true,
      drivers: transformedDrivers,
      count: transformedDrivers.length,
      total_drivers: drivers?.length || 0,
      assigned_count: assignedDriverIds.length
    })

  } catch (error) {
    console.error('Error in GET /api/sos-requests/available-drivers:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
