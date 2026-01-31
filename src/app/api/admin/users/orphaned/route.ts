import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { UserService } from '@/services/userService'
import { UserRole } from '@/types'

// GET /api/admin/users/orphaned - Find users in database that don't exist in Clerk
export async function GET(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they're admin
    const clerk = await clerkClient()
    const currentUser = await clerk.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    console.log('Finding orphaned users (in database but not in Clerk)...')

    // Get all users from database
    const { data: dbUsers, error: dbError } = await UserService.getUsers({ limit: 1000 })
    
    if (dbError || !dbUsers) {
      return NextResponse.json({ 
        error: `Failed to get database users: ${dbError}` 
      }, { status: 500 })
    }

    // Get all users from Clerk
    const clerkInstance = await clerkClient()
    const clerkUsers = await clerkInstance.users.getUserList({
      limit: 500,
      orderBy: '-created_at'
    })

    // Create a set of Clerk user IDs for fast lookup
    const clerkUserIds = new Set(clerkUsers.data.map(user => user.id))

    // Find orphaned users (in database but not in Clerk)
    const orphanedUsers = dbUsers.filter(dbUser => 
      dbUser.clerk_user_id && !clerkUserIds.has(dbUser.clerk_user_id)
    )

    console.log(`Found ${orphanedUsers.length} orphaned users`)

    return NextResponse.json({
      success: true,
      orphanedUsers: orphanedUsers.map(user => ({
        id: user.id,
        clerk_user_id: user.clerk_user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        is_active: user.is_active
      })),
      totalOrphaned: orphanedUsers.length,
      totalDatabase: dbUsers.length,
      totalClerk: clerkUsers.data.length
    })

  } catch (error) {
    console.error('Error finding orphaned users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/orphaned - Clean up orphaned users
export async function DELETE(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they're admin
    const clerkInstance2 = await clerkClient()
    const currentUser = await clerkInstance2.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userIds, action = 'delete' } = body

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ 
        error: 'userIds array is required' 
      }, { status: 400 })
    }

    console.log(`Processing ${userIds.length} orphaned users with action: ${action}`)

    const results = {
      processed: 0,
      deleted: 0,
      deactivated: 0,
      errors: [] as string[]
    }

    for (const userId of userIds) {
      try {
        if (action === 'delete') {
          const { success, error } = await UserService.deleteUser(userId)
          if (success) {
            results.deleted++
            results.processed++
          } else {
            results.errors.push(`Failed to delete user ${userId}: ${error}`)
          }
        } else if (action === 'deactivate') {
          const { data, error } = await UserService.updateUser(userId, { is_active: false })
          if (data) {
            results.deactivated++
            results.processed++
          } else {
            results.errors.push(`Failed to deactivate user ${userId}: ${error}`)
          }
        }
      } catch (error) {
        results.errors.push(`Error processing user ${userId}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} orphaned users`,
      results
    })

  } catch (error) {
    console.error('Error cleaning up orphaned users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
