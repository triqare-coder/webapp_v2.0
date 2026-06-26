import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/debug/create-test-transport-user - Create a test transport company user for testing
export async function POST(request: NextRequest) {
  // Test tooling that writes live user rows — never reachable in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  try {
    console.log('Creating test transport company user...')

    // Create a test transport company user
    const testTransportUser = {
      clerk_user_id: 'test_transport_' + Date.now(),
      email: 'transport.test@example.com',
      first_name: 'Transport',
      last_name: 'Company',
      full_name: 'Transport Company Ltd',
      role: 'transport_company',
      phone: '+1-555-0300',
      is_active: true
    }

    console.log('Attempting to insert transport user:', testTransportUser)

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([testTransportUser])
      .select()
      .single()

    if (userError) {
      console.error('Error creating transport user:', userError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create transport user',
        details: userError.message
      }, { status: 500 })
    }

    console.log('✅ Created transport user:', user)

    // Create a transport company record
    const transportCompanyData = {
      user_id: user.id,
      company_name: 'Test Transport Company Ltd',
      address_line: '123 Transport Street, City, State 12345',
      registration_number: 'TC-TEST-001',
      license_valid_till: '2025-12-31',
      is_verified: true
    }

    console.log('Creating transport company record...')

    const { data: company, error: companyError } = await supabase
      .from('transport_companies')
      .insert([transportCompanyData])
      .select()
      .single()

    if (companyError) {
      console.error('Error creating transport company:', companyError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create transport company',
        details: companyError.message,
        user: user
      }, { status: 500 })
    }

    console.log('✅ Created transport company:', company)

    // Create some test drivers for this transport company
    const testDrivers = [
      {
        clerk_user_id: 'test_driver_1_' + Date.now(),
        email: 'driver1.test@example.com',
        first_name: 'John',
        last_name: 'Driver',
        full_name: 'John Driver',
        role: 'driver',
        phone: '+1-555-0401',
        is_active: true
      },
      {
        clerk_user_id: 'test_driver_2_' + Date.now(),
        email: 'driver2.test@example.com',
        first_name: 'Jane',
        last_name: 'Driver',
        full_name: 'Jane Driver',
        role: 'driver',
        phone: '+1-555-0402',
        is_active: true
      }
    ]

    const createdDrivers = []

    console.log('Creating test drivers...')

    for (const driverData of testDrivers) {
      const { data: driverUser, error: driverUserError } = await supabase
        .from('users')
        .insert([driverData])
        .select()
        .single()

      if (driverUserError) {
        console.error('Error creating driver user:', driverUserError)
        continue
      }

      // Create driver record
      const driverRecord = {
        user_id: driverUser.id,
        transport_company_id: user.id, // Link to transport company user
        license_number: `DL-${driverUser.id.slice(-8).toUpperCase()}`,
        status: 'available',
        is_verified: true
      }

      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .insert([driverRecord])
        .select()
        .single()

      if (driverError) {
        console.error('Error creating driver record:', driverError)
      } else {
        console.log('✅ Created driver:', driver)
        createdDrivers.push({
          user: driverUser,
          driver: driver
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test transport company setup complete!',
      data: {
        transport_user: user,
        transport_company: company,
        drivers: createdDrivers
      },
      instructions: {
        note: 'This is a test user without Clerk authentication.',
        usage: 'You can now test the transport dashboard APIs with this user.',
        clerk_user_id: testTransportUser.clerk_user_id,
        email: testTransportUser.email
      }
    })

  } catch (error) {
    console.error('Error creating test transport user:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
