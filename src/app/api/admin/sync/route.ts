import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { SyncService } from '@/services/syncService'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/admin/sync - Perform various sync operations
export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const currentUser = await clerkClient.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId } = body

    switch (action) {
      case 'clerk-to-db':
        const clerkToDbResult = await SyncService.syncUsers()
        return NextResponse.json({
          success: clerkToDbResult.errors.length === 0,
          message: `Sync completed. ${clerkToDbResult.syncedUsers} users synced.`,
          result: clerkToDbResult
        })

      case 'db-to-clerk':
        // TODO: Implement syncDatabaseToClerk method
        const dbToClerkResult = { success: false, message: 'Method not implemented yet' }
        return NextResponse.json({
          success: dbToClerkResult.success,
          message: dbToClerkResult.message,
          result: dbToClerkResult
        })

      case 'full-sync':
        // TODO: Implement fullSync method
        const fullSyncResult = { clerkToDb: { success: false }, dbToClerk: { success: false } }
        return NextResponse.json({
          success: fullSyncResult.clerkToDb.success && fullSyncResult.dbToClerk.success,
          message: 'Full bidirectional sync completed',
          result: fullSyncResult
        })

      case 'sync-user':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for single user sync' }, { status: 400 })
        }
        // TODO: Implement syncSingleUser method
        const singleUserResult = { success: false, message: 'Method not implemented yet' }
        return NextResponse.json({
          success: singleUserResult.success,
          message: singleUserResult.message,
          result: singleUserResult
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/admin/sync - Get sync status
export async function GET(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const currentUser = await clerkClient.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const status = await SyncService.generateSyncReport()
    
    return NextResponse.json({
      success: true,
      status
    })
  } catch (error) {
    console.error('Sync status API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
