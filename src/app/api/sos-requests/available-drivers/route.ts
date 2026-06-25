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

    // Determine which drivers are currently busy, using BOTH the canonical inline model
    // (sos_requests.driver_id on an active request, plus the drivers table status) and the
    // legacy junction table — so a driver busy under either model is excluded.
    let assignedDriverIds: string[] = []
    if (status === 'available') {
      const busy = new Set<string>()

      // 1. Active inline assignments on sos_requests.
      const { data: inlineActive } = await supabase
        .from('sos_requests')
        .select('driver_id, status')
        .not('driver_id', 'is', null)
        .not('status', 'in', '("Arrived at Hospital","Cancelled")')
      inlineActive?.forEach(r => r.driver_id && busy.add(r.driver_id))

      // 2. drivers table marked unavailable (on_trip / assigned / inactive).
      const { data: busyDriverRows } = await supabase
        .from('drivers')
        .select('user_id, status')
        .neq('status', 'available')
      busyDriverRows?.forEach(d => d.user_id && busy.add(d.user_id))

      // 3. Legacy junction assignments tied to still-active requests.
      const { data: assignments } = await supabase
        .from('sos_request_assigned')
        .select('driver_id, sos_requests!inner ( id, status )')
      assignments?.forEach(a => {
        const sos = (a as any).sos_requests
        if (sos && sos.status !== 'Arrived at Hospital' && sos.status !== 'Cancelled') busy.add((a as any).driver_id)
      })

      assignedDriverIds = Array.from(busy)
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
