import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 1. Check drivers table structure
    const { data: allDrivers, error: allDriversError } = await supabase
      .from('drivers')
      .select('*')
      .limit(5)

    // 2. Check drivers with lat/lng
    const { data: driversWithLocation, error: driversWithLocationError } = await supabase
      .from('drivers')
      .select('user_id, latitude, longitude, status')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(10)

    // 3. Count total drivers
    const { count: totalDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })

    // 4. Count drivers with location
    const { count: driversWithLocationCount } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    // 5. Check the users/locations API query
    const { data: driversFull, error: driversFullError } = await supabase
      .from('drivers')
      .select(`
        user_id,
        latitude,
        longitude,
        status,
        license_number,
        last_updated_at,
        user:users!drivers_user_id_fkey(
          id,
          full_name,
          email,
          role,
          phone,
          avatar_url,
          is_active
        ),
        transport_company:transport_companies!drivers_transport_company_id_fkey(
          company_name
        )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(5)

    return NextResponse.json({
      summary: {
        totalDrivers,
        driversWithLocationCount,
        message: driversWithLocationCount === 0 
          ? 'No drivers have lat/lng set!'
          : `${driversWithLocationCount} drivers have locations`
      },
      sampleDrivers: {
        raw: allDrivers,
        error: allDriversError?.message
      },
      driversWithLocation: {
        data: driversWithLocation,
        error: driversWithLocationError?.message
      },
      fullQuery: {
        data: driversFull,
        error: driversFullError?.message
      }
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

