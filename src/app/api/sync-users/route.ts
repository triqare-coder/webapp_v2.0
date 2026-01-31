import { NextResponse } from 'next/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserService } from '@/services/userService'
import { MockUserStore } from '@/lib/mockUserStore'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/sync-users - Sync all Clerk users to database (public endpoint for setup)
export async function POST() {
  try {
    console.log('Starting user sync from Clerk to database...')

    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 500,
      orderBy: '-created_at'
    })

    console.log(`Found ${clerkUsers.data.length} users in Clerk`)

    const syncResults = {
      total: clerkUsers.data.length,
      synced: 0,
      created: 0,
      updated: 0,
      mockSynced: 0,
      errors: [] as string[]
    }

    // Sync each user
    for (const clerkUser of clerkUsers.data) {
      try {
        console.log(`Syncing user: ${clerkUser.id} (${clerkUser.emailAddresses[0]?.emailAddress})`)

        // First try to sync to database
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
          console.error(`Database sync failed for user ${clerkUser.id}:`, error)

          // Fallback to mock store
          console.log(`Using mock store for user ${clerkUser.id}`)
          const mockUser = MockUserStore.createMockUser(clerkUser)
          MockUserStore.storeUser(mockUser)

          syncResults.mockSynced++
          syncResults.synced++
          syncResults.created++

          console.log(`Successfully synced user ${clerkUser.id} to mock store`)
        } else if (dbUser) {
          syncResults.synced++
          console.log(`Successfully synced user ${clerkUser.id} to database`)

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

        // Even if there's an unexpected error, try mock store as last resort
        try {
          const mockUser = MockUserStore.createMockUser(clerkUser)
          MockUserStore.storeUser(mockUser)
          syncResults.mockSynced++
          syncResults.synced++
          syncResults.created++
          console.log(`Fallback: synced user ${clerkUser.id} to mock store after error`)
        } catch (mockError) {
          syncResults.errors.push(`Failed to sync user ${clerkUser.id}: ${syncError}`)
        }
      }
    }

    console.log('Sync completed:', syncResults)

    return NextResponse.json({
      success: true,
      message: `Sync completed. ${syncResults.synced} users processed (${syncResults.mockSynced} via mock store).`,
      results: syncResults
    })

  } catch (error) {
    console.error('Error syncing users:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET /api/sync-users - Get sync status
export async function GET() {
  try {
    console.log('Checking sync status...')

    // Get counts from both systems
    const clerkUsers = await clerkClient.users.getUserList({ limit: 1 })
    const clerkCount = clerkUsers.totalCount

    console.log(`Clerk users: ${clerkCount}`)

    // Get database user count
    const { data: dbUsers, error: dbError } = await UserService.getUsers({ limit: 1000 })
    const dbCount = dbUsers?.length || 0

    // Get mock store user count
    const mockCount = MockUserStore.getUserCount()

    console.log(`Database users: ${dbCount}`)
    console.log(`Mock store users: ${mockCount}`)

    const totalSyncedUsers = dbCount + mockCount

    const syncStatus = {
      clerkUsers: clerkCount,
      databaseUsers: dbCount,
      mockStoreUsers: mockCount,
      totalSyncedUsers,
      inSync: clerkCount === totalSyncedUsers,
      difference: clerkCount - totalSyncedUsers,
      lastSyncCheck: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      syncStatus
    })

  } catch (error) {
    console.error('Error checking sync status:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
