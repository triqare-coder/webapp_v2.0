import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { SyncService } from '@/services/syncService'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/admin/sync - Perform various sync operations
//
// ── Status of the three unfinished actions (db-to-clerk / full-sync / sync-user) ──
// DEFERRED. Dependency analysis (2026-06-10):
//   • These actions sync USER ACCOUNTS between Clerk auth and the Supabase
//     `users` table. They are consumed ONLY by the admin panel
//     `src/components/admin/SyncManager.tsx` (bidirectional-sync buttons).
//   • Driver-onboarding / admin KYC (Feature 1) does NOT use this endpoint.
//     That flow writes driver records via `/api/drivers` + `/api/drivers/upload-csv`
//     against the `drivers` table — no overlap with Clerk⇄DB account sync, and
//     none of these three actions are on its critical path.
//   • The backing SyncService methods (syncDatabaseToClerk / fullSync /
//     syncSingleUser) do not exist yet; only `syncUsers` (clerk-to-db) is built.
// Therefore these are left as honest 501 stubs rather than implemented now.
// To implement later: add the three methods to `src/services/syncService.ts`
// (mirror `syncUsers`) and wire them into the cases below.
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
        // DEFERRED: needs SyncService.syncDatabaseToClerk(). See header note.
        return NextResponse.json({
          success: false,
          deferred: true,
          message: 'Database→Clerk sync is not implemented yet (deferred — not required by driver-onboarding/KYC).',
        }, { status: 501 })

      case 'full-sync':
        // DEFERRED: needs SyncService.fullSync(). See header note.
        return NextResponse.json({
          success: false,
          deferred: true,
          message: 'Full bidirectional sync is not implemented yet (deferred — not required by driver-onboarding/KYC).',
        }, { status: 501 })

      case 'sync-user':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for single user sync' }, { status: 400 })
        }
        // DEFERRED: needs SyncService.syncSingleUser(). See header note.
        return NextResponse.json({
          success: false,
          deferred: true,
          message: 'Single-user sync is not implemented yet (deferred — not required by driver-onboarding/KYC).',
        }, { status: 501 })

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
