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

    // Basic input validation (defense-in-depth; the client also validates).
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof clerkUserId !== 'string' || !clerkUserId.startsWith('user_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration request' },
        { status: 400 },
      )
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'A valid email is required' },
        { status: 400 },
      )
    }
    if (typeof firstName !== 'string' || !firstName.trim() ||
        typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json(
        { success: false, error: 'First and last name are required' },
        { status: 400 },
      )
    }
    if (typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 },
      )
    }

    // Idempotency / anti-duplicate guard: if a user row already exists for this
    // Clerk id or email, do not create a second one (the registration POST can be
    // retried by the client, and the endpoint is unauthenticated).
    const { data: existing } = await supabase
      .from('users')
      .select('id, clerk_user_id, email')
      .or(`clerk_user_id.eq.${clerkUserId},email.eq.${email}`)
      .maybeSingle()

    if (existing) {
      if (existing.clerk_user_id === clerkUserId) {
        return NextResponse.json({
          success: true,
          message: 'Transport company already registered',
          data: { user: existing },
        })
      }
      return NextResponse.json(
        { success: false, error: 'An account already exists for this email' },
        { status: 409 },
      )
    }

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
        error: 'Failed to create user record'
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
        error: 'Failed to create transport company record'
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
    return NextResponse.json({
      success: false,
      error: 'Registration failed'
    }, { status: 500 })
  }
}
