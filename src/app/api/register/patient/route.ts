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
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      country,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      bloodType,
      medicalConditions,
      allergies,
      medications,
      insuranceProvider,
      insuranceNumber
    } = body

    console.log('Creating patient registration for:', { email, clerkUserId })

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
        // Same Clerk identity retrying — treat as success (already registered).
        return NextResponse.json({
          success: true,
          message: 'Patient already registered',
          data: { user: existing },
        })
      }
      // Email belongs to a different Clerk identity — refuse to overwrite/duplicate.
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
          role: 'patient',
          is_active: true,
          date_of_birth: dateOfBirth,
          gender,
          address,
          city,
          state,
          zip_code: zipCode,
          country,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          emergency_contact_relationship: emergencyContactRelationship,
          medical_conditions: medicalConditions,
          allergies,
          medications,
          blood_type: bloodType,
          insurance_provider: insuranceProvider,
          insurance_number: insuranceNumber
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

    // Create patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert([
        {
          user_id: user.id,
          dob: dateOfBirth,
          gender,
          blood_group: bloodType
        }
      ])
      .select()
      .single()

    if (patientError) {
      console.error('Error creating patient:', patientError)
      // If patient creation fails, we should clean up the user record
      await supabase.from('users').delete().eq('id', user.id)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create patient record'
      }, { status: 500 })
    }

    console.log('✅ Created patient:', patient)

    return NextResponse.json({
      success: true,
      message: 'Patient registration successful',
      data: {
        user,
        patient
      }
    })

  } catch (error: unknown) {
    console.error('Patient registration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Registration failed'
    }, { status: 500 })
  }
}
