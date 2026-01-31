import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { UserService } from '@/services/userService'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing profile API authentication flow...')

    // Test the auth function
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user',
        message: 'This endpoint requires authentication. User must be signed in.'
      })
    }

    console.log('Authenticated user ID:', userId)

    // Test getting user by Clerk ID
    const { data: user, error } = await UserService.getUserByClerkId(userId)

    return NextResponse.json({
      success: true,
      message: 'Profile auth test completed',
      authenticatedUserId: userId,
      userLookupResult: {
        success: !error,
        error: error,
        user: user ? {
          id: user.id,
          clerk_user_id: user.clerk_user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          department: user.department,
          employee_id: user.employee_id,
          bio: user.bio,
          avatar_url: user.avatar_url
        } : null
      }
    })

  } catch (error) {
    console.error('Profile auth test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test profile auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
