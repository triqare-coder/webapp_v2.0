import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'
import { TransportCompanyService } from '@/services/transportCompanyService'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()
    
    // Step 1: Get test transport company user
    const { data: testUser, error: testError } = await UserService.getUserByEmail('transport.test@example.com')
    if (testError || !testUser) {
      return NextResponse.json({ 
        step: 1,
        error: 'Test user not found',
        details: testError 
      }, { status: 404 })
    }
    
    // Step 2: Get test transport company
    let testCompany
    try {
      testCompany = await TransportCompanyService.getTransportCompanyByUserId(testUser.id)
    } catch (companyError) {
      return NextResponse.json({
        step: 2,
        error: 'Test transport company not found',
        details: companyError instanceof Error ? companyError.message : String(companyError),
        userId: testUser.id
      }, { status: 404 })
    }
    
    // Step 3: Validate required fields
    if (!formData.full_name || !formData.email || !formData.phone || !formData.license_number) {
      return NextResponse.json({ 
        step: 3,
        error: 'Missing required fields',
        received: formData,
        required: ['full_name', 'email', 'phone', 'license_number']
      }, { status: 400 })
    }
    
    // Step 4: Check if email already exists
    const { data: existingUser } = await UserService.getUserByEmail(formData.email)
    if (existingUser) {
      return NextResponse.json({ 
        step: 4,
        error: 'A user with this email already exists',
        existingUser: existingUser
      }, { status: 400 })
    }
    
    // Step 5: Create user
    const userData = {
      clerk_user_id: `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: formData.email,
      full_name: formData.full_name,
      first_name: formData.first_name || '',
      last_name: formData.last_name || '',
      phone: formData.phone,
      role: 'driver' as const,
      created_by: testUser.id
    }
    
    const { data: newUser, error: userCreateError } = await UserService.createUser(userData)
    if (userCreateError || !newUser) {
      return NextResponse.json({ 
        step: 5,
        error: 'Failed to create user',
        details: userCreateError,
        userData: userData
      }, { status: 500 })
    }
    
    // Step 6: Create driver record with only existing columns
    const driverData = {
      user_id: newUser.id,
      transport_company_id: testCompany.user_id,
      license_number: formData.license_number,
      aadhar_number: formData.aadhar_number || null,
      is_verified: formData.is_verified || false,
      status: formData.status || 'available',
      address_line: formData.address_line || null,
      country_id: formData.country_id || null,
      state_id: formData.state_id || null,
      city_id: formData.city_id || null,
      pincode_id: formData.pincode_id || null
    }
    
    const { data: newDriver, error: driverCreateError } = await supabase
      .from('drivers')
      .insert([driverData])
      .select()
      .single()
    
    if (driverCreateError || !newDriver) {
      // Clean up the user record
      await UserService.deleteUser(newUser.id)
      return NextResponse.json({ 
        step: 6,
        error: 'Failed to create driver',
        details: driverCreateError,
        driverData: driverData
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Driver created successfully',
      data: {
        user: newUser,
        driver: newDriver,
        company: testCompany
      },
      steps: {
        1: 'Found test user',
        2: 'Found test company', 
        3: 'Validated required fields',
        4: 'Checked email uniqueness',
        5: 'Created user record',
        6: 'Created driver record'
      }
    })

  } catch (error) {
    console.error('Error in test add driver:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
