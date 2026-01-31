import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clerkUserId,
      firstName,
      lastName,
      email,
      phone,
      companyName,
      registrationNumber,
      addressLine,
      licenseValidTill,
      countryId,
      stateId,
      cityId,
      pincodeId
    } = body

    console.log('Creating transport company registration for:', { email, clerkUserId, companyName })

    // Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          clerk_user_id: clerkUserId,
          email,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone,
          role: 'transport_company',
          is_active: true
        }
      ])
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create user record',
        details: userError.message
      }, { status: 500 })
    }

    console.log('✅ Created user:', user)

    // Create transport company record
    const { data: transportCompany, error: transportCompanyError } = await supabase
      .from('transport_companies')
      .insert([
        {
          user_id: user.id,
          company_name: companyName,
          address_line: addressLine,
          registration_number: registrationNumber,
          license_valid_till: licenseValidTill || null,
          is_verified: false, // Will be verified by admin
          country_id: countryId || null,
          state_id: stateId || null,
          city_id: cityId || null,
          pincode_id: pincodeId || null
        }
      ])
      .select()
      .single()

    if (transportCompanyError) {
      console.error('Error creating transport company:', transportCompanyError)
      // If transport company creation fails, we should clean up the user record
      await supabase.from('users').delete().eq('id', user.id)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create transport company record',
        details: transportCompanyError.message
      }, { status: 500 })
    }

    console.log('✅ Created transport company:', transportCompany)

    return NextResponse.json({
      success: true,
      message: 'Transport company registration successful',
      data: {
        user,
        transportCompany
      }
    })

  } catch (error: unknown) {
    console.error('Transport company registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      success: false,
      error: 'Registration failed',
      details: errorMessage
    }, { status: 500 })
  }
}
