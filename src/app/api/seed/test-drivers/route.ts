import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Kochi, India center coordinates
const KOCHI_CENTER = { lat: 9.9312, lng: 76.2673 }
const RADIUS_KM = 15 // 15km radius around Kochi

// Generate random coordinates within radius of center
function randomLocationInKochi(): { lat: number; lng: number } {
  // Convert km to degrees (approximately)
  const latOffset = (Math.random() - 0.5) * 2 * (RADIUS_KM / 111) // 1 degree ≈ 111 km
  const lngOffset = (Math.random() - 0.5) * 2 * (RADIUS_KM / (111 * Math.cos(KOCHI_CENTER.lat * Math.PI / 180)))
  
  return {
    lat: KOCHI_CENTER.lat + latOffset,
    lng: KOCHI_CENTER.lng + lngOffset
  }
}

// Indian first names
const firstNames = [
  'Rahul', 'Arun', 'Vijay', 'Suresh', 'Rajesh', 'Deepak', 'Amit', 'Sanjay', 'Prakash', 'Manoj',
  'Sunil', 'Ravi', 'Ashok', 'Vinod', 'Anand', 'Mohan', 'Kumar', 'Sathish', 'Ganesh', 'Pradeep'
]

// Indian last names
const lastNames = [
  'Nair', 'Menon', 'Pillai', 'Kumar', 'Sharma', 'Varma', 'Thomas', 'Joseph', 'George', 'Mathew',
  'Krishnan', 'Unnikrishnan', 'Subramaniam', 'Iyer', 'Reddy', 'Rao', 'Patel', 'Das', 'Roy', 'Singh'
]

const statuses = ['available', 'assigned', 'on_trip', 'available', 'available'] // More available

export async function POST() {
  // Seeds test driver rows into the live DB — never reachable in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  try {
    const results = { created: 0, errors: [] as string[] }

    // First, get or create a transport company to assign drivers to
    let transportCompanyId: string | null = null
    
    const { data: existingCompany } = await supabase
      .from('transport_companies')
      .select('user_id')
      .limit(1)
      .single()

    if (existingCompany) {
      transportCompanyId = existingCompany.user_id
    } else {
      // Create a test transport company user first
      const { data: companyUser, error: companyUserError } = await supabase
        .from('users')
        .insert([{
          clerk_user_id: `test_company_${Date.now()}`,
          email: `test.transport.company.${Date.now()}@example.com`,
          full_name: 'Kochi Emergency Transport Services',
          first_name: 'Kochi',
          last_name: 'Transport',
          role: 'transport_company',
          is_active: true
        }])
        .select()
        .single()

      if (companyUserError || !companyUser) {
        return NextResponse.json({ error: 'Failed to create transport company', details: companyUserError }, { status: 500 })
      }

      // Create transport company record
      const { error: companyError } = await supabase
        .from('transport_companies')
        .insert([{
          user_id: companyUser.id,
          company_name: 'Kochi Emergency Transport Services',
          registration_number: `KL-TC-${Date.now().toString().slice(-6)}`,
          is_verified: true
        }])

      if (companyError) {
        return NextResponse.json({ error: 'Failed to create transport company record', details: companyError }, { status: 500 })
      }

      transportCompanyId = companyUser.id
    }

    // Create 20 test drivers
    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[i % firstNames.length]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const fullName = `${firstName} ${lastName}`
      const location = randomLocationInKochi()
      const timestamp = Date.now() + i

      // Create user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          clerk_user_id: `test_driver_kochi_${timestamp}_${i}`,
          email: `driver.${firstName.toLowerCase()}.${timestamp}@kochitest.com`,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: `+91-98${String(47000000 + i).padStart(8, '0')}`,
          role: 'driver',
          is_active: true
        }])
        .select()
        .single()

      if (userError || !user) {
        results.errors.push(`Failed to create user ${fullName}: ${userError?.message}`)
        continue
      }

      // Create driver record with location
      const { error: driverError } = await supabase
        .from('drivers')
        .insert([{
          user_id: user.id,
          transport_company_id: transportCompanyId,
          license_number: `KL-${String(20240000 + i).padStart(8, '0')}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          is_verified: true,
          latitude: location.lat,
          longitude: location.lng,
          last_updated_at: new Date().toISOString()
        }])

      if (driverError) {
        results.errors.push(`Failed to create driver record for ${fullName}: ${driverError.message}`)
        // Clean up user
        await supabase.from('users').delete().eq('id', user.id)
        continue
      }

      results.created++
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.created} test drivers in Kochi area`,
      errors: results.errors.length > 0 ? results.errors : undefined,
      transportCompanyId
    })

  } catch (error) {
    console.error('Error seeding test drivers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed drivers' },
      { status: 500 }
    )
  }
}

