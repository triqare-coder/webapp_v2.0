import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { clerkClient } from '@clerk/nextjs/server'
import { UserService } from '@/services/userService'
import { supabase } from '@/lib/supabase'

// Clerk webhook handler for automatic user synchronization
export async function POST(req: NextRequest) {
  try {
    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    // Get the body
    const payload = await req.text()
    const body = JSON.parse(payload)

    // Get the Webhook secret from environment
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET is not set')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: any

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    // Handle the webhook
    const { type, data } = evt
    console.log(`Received Clerk webhook: ${type}`)

    switch (type) {
      case 'user.created':
        await handleUserCreated(data)
        break
      case 'user.updated':
        await handleUserUpdated(data)
        break
      case 'user.deleted':
        await handleUserDeleted(data)
        break
      default:
        console.log(`Unhandled webhook type: ${type}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleUserCreated(userData: any) {
  try {
    console.log('Handling user.created webhook:', userData.id)

    // Check if user has no role assigned (typical for OAuth signups)
    const hasRole = userData.public_metadata?.role || userData.unsafe_metadata?.role

    if (!hasRole) {
      console.log('User has no role assigned, setting default "patient" role:', userData.id)

      // Set default "patient" role in both public and unsafe metadata
      const clerk = await clerkClient()
      await clerk.users.updateUserMetadata(userData.id, {
        publicMetadata: {
          ...userData.public_metadata,
          role: 'patient'
        },
        unsafeMetadata: {
          ...userData.unsafe_metadata,
          role: 'patient'
        }
      })

      // Update userData for sync
      userData.public_metadata = {
        ...userData.public_metadata,
        role: 'patient'
      }
      userData.unsafe_metadata = {
        ...userData.unsafe_metadata,
        role: 'patient'
      }

      console.log('Successfully set patient role for user:', userData.id)
    }

    const result = await UserService.syncUserFromClerk({
      id: userData.id,
      emailAddresses: userData.email_addresses,
      firstName: userData.first_name,
      lastName: userData.last_name,
      imageUrl: userData.image_url,
      lastSignInAt: userData.last_sign_in_at,
      createdAt: userData.created_at,
      publicMetadata: userData.public_metadata,
      privateMetadata: userData.private_metadata,
      unsafeMetadata: userData.unsafe_metadata
    })

    if (result.error) {
      console.error('Failed to sync created user:', result.error)
    } else {
      console.log('Successfully synced created user:', userData.id)

      // Check if this user was created from a CSV import invitation
      await processPendingCSVImport(userData)
    }
  } catch (error) {
    console.error('Error handling user.created:', error)
  }
}

async function handleUserUpdated(userData: any) {
  try {
    console.log('Handling user.updated webhook:', userData.id)
    
    const result = await UserService.syncUserFromClerk({
      id: userData.id,
      emailAddresses: userData.email_addresses,
      firstName: userData.first_name,
      lastName: userData.last_name,
      imageUrl: userData.image_url,
      lastSignInAt: userData.last_sign_in_at,
      createdAt: userData.created_at,
      publicMetadata: userData.public_metadata,
      privateMetadata: userData.private_metadata
    })

    if (result.error) {
      console.error('Failed to sync updated user:', result.error)
    } else {
      console.log('Successfully synced updated user:', userData.id)
    }
  } catch (error) {
    console.error('Error handling user.updated:', error)
  }
}

async function handleUserDeleted(userData: any) {
  try {
    console.log('Handling user.deleted webhook:', userData.id)

    // Find user by Clerk ID and deactivate instead of deleting
    const { data: user } = await UserService.getUserByClerkId(userData.id)

    if (user) {
      const result = await UserService.deactivateUser(user.id)
      if (result.error) {
        console.error('Failed to deactivate deleted user:', result.error)
      } else {
        console.log('Successfully deactivated deleted user:', userData.id)
      }
    } else {
      console.log('User not found in database for deletion:', userData.id)
    }
  } catch (error) {
    console.error('Error handling user.deleted:', error)
  }
}

// Process pending CSV import data when user accepts invitation
async function processPendingCSVImport(userData: any) {
  try {
    const email = userData.email_addresses?.[0]?.email_address
    if (!email) {
      console.log('No email found for user:', userData.id)
      return
    }

    console.log('Checking for pending CSV import for email:', email)

    // Find pending import by email
    const { data: pendingImport, error: fetchError } = await supabase
      .from('pending_csv_imports')
      .select('*')
      .eq('email', email)
      .eq('processed', false)
      .single()

    if (fetchError || !pendingImport) {
      console.log('No pending CSV import found for:', email)
      return
    }

    console.log('Found pending CSV import:', pendingImport.import_type, 'for', email)

    // Get the user record that was just created
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userData.id)
      .single()

    if (!user) {
      console.error('User not found in database:', userData.id)
      return
    }

    const importData = pendingImport.data as any

    // Process based on import type
    switch (pendingImport.import_type) {
      case 'driver':
        await processDriverImport(user.id, importData)
        break
      case 'patient':
        await processPatientImport(user.id, importData)
        break
      case 'transport_company':
        await processTransportCompanyImport(user.id, importData)
        break
      default:
        console.error('Unknown import type:', pendingImport.import_type)
        return
    }

    // Mark as processed
    await supabase
      .from('pending_csv_imports')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', pendingImport.id)

    console.log('Successfully processed CSV import for:', email)
  } catch (error) {
    console.error('Error processing pending CSV import:', error)
  }
}

async function processDriverImport(userId: string, data: any) {
  const driverData = {
    user_id: userId,
    license_number: data.license_number,
    aadhar_number: data.aadhar_number,
    is_verified: data.is_verified,
    status: data.status,
    transport_company_id: data.transport_company_id,
    latitude: data.latitude,
    longitude: data.longitude,
    address_line: data.address_line,
    country_id: data.country_id,
    state_id: data.state_id,
    city_id: data.city_id,
    pincode_id: data.pincode_id
  }

  const { error } = await supabase.from('drivers').insert(driverData)
  if (error) {
    console.error('Failed to create driver record:', error)
    throw error
  }
  console.log('Driver record created for user:', userId)
}

async function processPatientImport(userId: string, data: any) {
  const patientData = {
    user_id: userId,
    dob: data.dob,
    gender: data.gender,
    blood_group: data.blood_group,
    allergies: data.allergies,
    abha_id: data.abha_id,
    insurance_provider: data.insurance_provider,
    insurance_policy_number: data.insurance_policy_number,
    insurance_valid_till: data.insurance_valid_till,
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_phone: data.emergency_contact_phone,
    emergency_contact_relation: data.emergency_contact_relation,
    latitude: data.latitude,
    longitude: data.longitude,
    address_line: data.address_line,
    country_id: data.country_id,
    state_id: data.state_id,
    city_id: data.city_id,
    pincode_id: data.pincode_id
  }

  const { error } = await supabase.from('patients').insert(patientData)
  if (error) {
    console.error('Failed to create patient record:', error)
    throw error
  }
  console.log('Patient record created for user:', userId)
}

async function processTransportCompanyImport(userId: string, data: any) {
  const companyData = {
    user_id: userId,
    company_name: data.company_name,
    address_line: data.address_line,
    registration_number: data.registration_number,
    license_valid_till: data.license_valid_till,
    is_verified: data.is_verified,
    country_id: data.country_id,
    state_id: data.state_id,
    city_id: data.city_id,
    pincode_id: data.pincode_id
  }

  const { error } = await supabase.from('transport_companies').insert(companyData)
  if (error) {
    console.error('Failed to create transport company record:', error)
    throw error
  }
  console.log('Transport company record created for user:', userId)
}
