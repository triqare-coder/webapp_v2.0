import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { DriverService } from '@/services/driverService'
import { UserService } from '@/services/userService'
import { supabase } from '@/lib/supabase'

// GET /api/transport/drivers - Get drivers for the current transport company user
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters first
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('test') === 'true'

    let currentUser: any = null

    if (testMode) {
      // Try to find any existing transport company user
      const { data: existingTransportUsers, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'transport_company')
        .limit(1)
        .single()

      if (existingTransportUsers && !searchError) {
        currentUser = existingTransportUsers
      } else {
        // No transport company users found - return empty list
        return NextResponse.json({
          drivers: [],
          count: 0,
          success: true,
          message: 'No transport company users found. Please create a transport company first.'
        })
      }
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
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') as 'available' | 'assigned' | 'on_trip' | 'inactive' | undefined
    const is_verified = searchParams.get('is_verified') ? searchParams.get('is_verified') === 'true' : undefined
    const country_id = searchParams.get('country_id') || undefined
    const state_id = searchParams.get('state_id') || undefined
    const city_id = searchParams.get('city_id') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const filters = {
      search,
      status,
      is_verified,
      country_id,
      state_id,
      city_id,
      limit,
      offset
    }

    // Get drivers for this transport company
    console.log('Fetching drivers for transport company user:', currentUser.id, currentUser.email)
    const { drivers, count } = await DriverService.getDriversForTransportCompany(currentUser.id, filters)

    console.log(`Found ${count} drivers for transport company ${currentUser.id}`)

    return NextResponse.json({
      drivers,
      count,
      success: true
    })
  } catch (error) {
    console.error('Error fetching transport company drivers:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch drivers',
        success: false 
      },
      { status: 500 }
    )
  }
}
