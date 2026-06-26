import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserService } from '@/services/userService'
import { MockUserStore } from '@/lib/mockUserStore'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let { data: user, error } = await UserService.getUserByClerkId(userId)

    // If user doesn't exist in database, check mock store
    if (error && error.includes('Cannot coerce the result to a single JSON object')) {
      console.log('User not found in database, checking mock store...')

      const mockUser = MockUserStore.getUserByClerkId(userId)
      if (mockUser) {
        console.log('User found in mock store')
        user = mockUser
      } else {
        // SECURITY: do NOT fabricate a default admin profile here. Previously this
        // returned role:'admin' for any authenticated user not yet synced to the DB,
        // which let brand-new self-signed-up accounts be treated as administrators.
        // An authenticated user with no DB record is in an onboarding-required state.
        console.log('Authenticated user has no DB/mock record — onboarding required')
        return NextResponse.json(
          { error: 'Profile not found', code: 'onboarding_required' },
          { status: 404 }
        )
      }
    } else if (error) {
      console.error('Error fetching user profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  // Updated to handle user creation
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Get current user from database
    let { data: currentUser, error: fetchError } = await UserService.getUserByClerkId(userId)

    // If user doesn't exist in database, check mock store for updates
    if (fetchError && fetchError.includes('Cannot coerce the result to a single JSON object')) {
      console.log('User not found in database during update, checking mock store...')

      const mockUser = MockUserStore.getUserByClerkId(userId)
      if (mockUser) {
        console.log('User found in mock store for update')
        currentUser = mockUser
      } else {
        // SECURITY: do NOT fabricate a default admin profile (see GET handler).
        // An authenticated user with no DB record cannot update a profile that
        // does not exist; treat as onboarding-required.
        console.log('Authenticated user has no DB/mock record — onboarding required')
        return NextResponse.json(
          { error: 'Profile not found', code: 'onboarding_required' },
          { status: 404 }
        )
      }
    } else if (fetchError || !currentUser) {
      console.error('Error fetching current user:', fetchError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {}

    // Basic fields
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.bio !== undefined) updateData.bio = body.bio
    if (body.phone !== undefined) updateData.phone = body.phone

    // Personal information
    if (body.date_of_birth !== undefined) updateData.date_of_birth = body.date_of_birth
    // Skip address field as it doesn't exist in users table - use transport_companies.address_line instead
    // if (body.address !== undefined) updateData.address = body.address
    if (body.emergency_contact_name !== undefined) updateData.emergency_contact_name = body.emergency_contact_name
    if (body.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = body.emergency_contact_phone

    // Work/Professional information
    if (body.employee_id !== undefined) updateData.employee_id = body.employee_id
    if (body.department !== undefined) updateData.department = body.department
    if (body.position !== undefined) updateData.position = body.position

    // Avatar/Profile image
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url

    // Medical fields (for patients)
    if (body.blood_type !== undefined) updateData.blood_type = body.blood_type
    if (body.allergies !== undefined) updateData.allergies = body.allergies
    if (body.medical_conditions !== undefined) updateData.medical_conditions = body.medical_conditions
    if (body.medications !== undefined) updateData.medications = body.medications
    if (body.insurance_provider !== undefined) updateData.insurance_provider = body.insurance_provider
    if (body.insurance_number !== undefined) updateData.insurance_number = body.insurance_number
    if (body.last_checkup !== undefined) updateData.last_checkup = body.last_checkup

    // Driver fields - Skip fields that don't exist in the users table schema
    // Note: These fields should be stored in the drivers table or transport_companies table instead
    // if (body.license_number !== undefined) updateData.license_number = body.license_number
    // if (body.license_class !== undefined) updateData.license_class = body.license_class
    // if (body.license_expiry !== undefined) updateData.license_expiry = body.license_expiry
    // if (body.medical_cert_expiry !== undefined) updateData.medical_cert_expiry = body.medical_cert_expiry
    // if (body.years_experience !== undefined) updateData.years_experience = body.years_experience
    // if (body.special_certifications !== undefined) updateData.special_certifications = body.special_certifications
    // if (body.languages_spoken !== undefined) updateData.languages_spoken = body.languages_spoken
    // if (body.current_shift !== undefined) updateData.current_shift = body.current_shift
    // if (body.vehicle_assigned !== undefined) updateData.vehicle_assigned = body.vehicle_assigned

    // Always update the timestamp
    updateData.updated_at = new Date().toISOString()

    // Update user profile in database or mock store
    if (currentUser && currentUser.clerk_user_id === userId && currentUser.id === userId) {
      // This is a default mock user (where id equals clerk_user_id), just return success with updated data
      const updatedUser = { ...currentUser, ...updateData, updated_at: new Date().toISOString() }
      return NextResponse.json({
        message: 'Profile updated successfully (default mock mode)',
        user: updatedUser
      })
    } else if (MockUserStore.hasUser(userId)) {
      // This is a mock store user, update in mock store
      const updatedUser = MockUserStore.updateUser(userId, updateData)
      if (updatedUser) {
        return NextResponse.json({
          message: 'Profile updated successfully (mock store)',
          user: updatedUser
        })
      } else {
        return NextResponse.json({ error: 'Failed to update profile in mock store' }, { status: 500 })
      }
    } else {
      // Real database user, perform actual update
      const { data: updatedUser, error: updateError } = await UserService.updateUser(currentUser?.id || userId, updateData)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Profile updated successfully',
        user: updatedUser
      })
    }
  } catch (error) {
    console.error('Error in PUT /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
