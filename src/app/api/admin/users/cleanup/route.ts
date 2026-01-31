import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'
import { UserService } from '@/services/userService'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/admin/users/cleanup - Clean up duplicate users in database (admin only)
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

    // Clean up duplicate users
    const { success, error, cleaned } = await UserService.cleanupDuplicateUsers()

    if (!success) {
      return NextResponse.json({ 
        error: `Failed to cleanup duplicates: ${error}` 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${cleaned} duplicate users`,
      cleaned
    })

  } catch (error) {
    console.error('Error cleaning up duplicate users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/users/cleanup - Get duplicate users information
export async function GET(request: NextRequest) {
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

    // Find duplicate users
    const { data: duplicates, error } = await UserService.findDuplicateUsers()

    if (error) {
      return NextResponse.json({ 
        error: `Failed to find duplicates: ${error}` 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      duplicates: duplicates || [],
      totalDuplicates: duplicates?.length || 0,
      totalAffectedUsers: duplicates?.reduce((sum, dup) => sum + dup.count, 0) || 0
    })

  } catch (error) {
    console.error('Error finding duplicate users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
