import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/admin/users/create - Create a new user with Clerk (admin only)
export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they're admin
    const currentUser = await clerkClient.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role, password } = body

    console.log('Received user creation request:', {
      email,
      firstName,
      lastName,
      role,
      hasPassword: !!password,
      passwordLength: password?.length
    })

    // Validate required fields
    if (!email || !firstName || !role) {
      return NextResponse.json({
        error: 'Missing required fields: email, firstName, and role are required'
      }, { status: 400 })
    }

    // Validate password requirement - Clerk instance requires password
    if (!password) {
      return NextResponse.json({
        error: 'Password is required. Please provide a password for the new user.'
      }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters long'
      }, { status: 400 })
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'ert', 'transport_company', 'patient', 'driver']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    try {
      // Create user in Clerk
      const newUser = await clerkClient.users.createUser({
        emailAddress: [email],
        firstName: firstName,
        lastName: lastName || '',
        password: password, // Password is required by this Clerk instance
        publicMetadata: {
          role: role
        },
        unsafeMetadata: {
          role: role // Store role in both public and unsafe for security
        },
        privateMetadata: {
          createdBy: currentUserId,
          createdAt: new Date().toISOString()
        }
      })

      // Create user in database
      const { UserService } = await import('@/services/userService')
      const fullName = [firstName, lastName].filter(Boolean).join(' ')

      const { data: dbUser, error: dbError } = await UserService.createUser({
        clerk_user_id: newUser.id,
        email: email,
        first_name: firstName,
        last_name: lastName || undefined,
        full_name: fullName,
        role: role,
        avatar_url: newUser.imageUrl || undefined,
        created_by: currentUserId
      })

      if (dbError) {
        console.error('Failed to create user in database:', dbError)
        console.log('Database creation failed, using mock store fallback...')

        // Use mock store as fallback
        const { MockUserStore } = await import('@/lib/mockUserStore')
        const mockUser = MockUserStore.createMockUser(newUser)
        MockUserStore.storeUser(mockUser)

        console.log(`User ${newUser.id} stored in mock store as fallback`)

        return NextResponse.json({
          success: true,
          user: {
            id: newUser.id,
            databaseId: mockUser.id,
            email: newUser.primaryEmailAddress?.emailAddress,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.publicMetadata?.role,
            createdAt: newUser.createdAt,
            passwordSetupRequired: false,
            storedInMockStore: true
          },
          message: 'User created successfully (using fallback storage due to database constraints)',
          warning: 'User data is stored in temporary storage. Database constraints need to be resolved for permanent storage.'
        })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          databaseId: dbUser?.id,
          email: newUser.primaryEmailAddress?.emailAddress,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.publicMetadata?.role,
          createdAt: newUser.createdAt,
          passwordSetupRequired: false,
          storedInMockStore: false
        },
        message: 'User created successfully with password and saved to database'
      })

    } catch (clerkError: any) {
      console.error('Clerk user creation error:', clerkError)
      console.error('Clerk error details:', {
        status: clerkError.status,
        message: clerkError.message,
        errors: clerkError.errors,
        clerkTraceId: clerkError.clerkTraceId
      })

      // Handle specific Clerk errors
      if (clerkError.errors && Array.isArray(clerkError.errors)) {
        const errorMessages = clerkError.errors.map((err: any) => {
          console.error('Individual error:', err)
          return err.message || err.longMessage || 'Unknown error'
        }).join(', ')
        return NextResponse.json({
          error: `Failed to create user: ${errorMessages}`
        }, { status: 400 })
      }

      // Handle email already exists error
      if (clerkError.message?.includes('already exists') || clerkError.message?.includes('duplicate')) {
        return NextResponse.json({
          error: 'A user with this email address already exists'
        }, { status: 409 })
      }

      // Handle unprocessable entity (422) - usually validation errors
      if (clerkError.status === 422) {
        return NextResponse.json({
          error: `Failed to create user: ${clerkError.message || 'Invalid data provided'}`
        }, { status: 400 })
      }

      return NextResponse.json({
        error: `Failed to create user in authentication system: ${clerkError.message || 'Unknown error'}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
