import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'
import { UserService } from '@/services/userService'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/admin/users/sync - Sync all Clerk users to database (admin only)
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

    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 500, // Adjust as needed
      orderBy: '-created_at'
    })

    const syncResults = {
      total: clerkUsers.data.length,
      synced: 0,
      updated: 0,
      created: 0,
      duplicatesResolved: 0,
      errors: [] as string[]
    }

    // Sync each user
    for (const clerkUser of clerkUsers.data) {
      try {
        const { data: dbUser, error } = await UserService.syncUserFromClerk({
          id: clerkUser.id,
          emailAddresses: clerkUser.emailAddresses,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          lastSignInAt: clerkUser.lastSignInAt,
          createdAt: clerkUser.createdAt,
          publicMetadata: clerkUser.publicMetadata,
          privateMetadata: clerkUser.privateMetadata
        })

        if (error) {
          syncResults.errors.push(`Failed to sync user ${clerkUser.id}: ${error}`)
        } else if (dbUser) {
          syncResults.synced++
          // Check if this was an update or create by looking at created_at vs updated_at
          const wasCreated = new Date(dbUser.created_at).getTime() === new Date(dbUser.updated_at).getTime()
          if (wasCreated) {
            syncResults.created++
          } else {
            syncResults.updated++
          }
        }
      } catch (syncError) {
        console.error(`Error syncing user ${clerkUser.id}:`, syncError)
        syncResults.errors.push(`Unexpected error syncing user ${clerkUser.id}: ${syncError}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed. ${syncResults.synced} users processed.`,
      results: syncResults
    })

  } catch (error) {
    console.error('Error syncing users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/users/sync - Get sync status and statistics
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

    // Get counts from both systems
    const clerkUsers = await clerkClient.users.getUserList({ limit: 1 })
    const clerkCount = clerkUsers.totalCount

    const { data: dbStats, error: dbError } = await UserService.getUserStats()
    
    if (dbError) {
      return NextResponse.json({ error: `Failed to get database stats: ${dbError}` }, { status: 500 })
    }

    const dbCount = dbStats?.total || 0
    const syncStatus = {
      clerkUsers: clerkCount,
      databaseUsers: dbCount,
      inSync: clerkCount === dbCount,
      difference: clerkCount - dbCount,
      lastSyncCheck: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      syncStatus,
      databaseStats: dbStats
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
