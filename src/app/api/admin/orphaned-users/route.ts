import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { SyncService } from '@/services/syncService'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// GET /api/admin/orphaned-users - Get list of orphaned users
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

    const orphanedInfo = await SyncService.getOrphanedUsers()
    
    return NextResponse.json({
      success: true,
      data: orphanedInfo
    })
  } catch (error) {
    console.error('Error fetching orphaned users:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch orphaned users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/orphaned-users - Handle orphaned users
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
    const { action, userIds } = body

    if (!action || !['deactivate', 'delete', 'recreate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be: deactivate, delete, or recreate' }, { status: 400 })
    }

    // TODO: Implement handleOrphanedUsers method in SyncService
    const result = { success: false, error: 'Method not implemented yet' }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error handling orphaned users:', error)
    return NextResponse.json(
      { 
        error: 'Failed to handle orphaned users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/orphaned-users - Bulk delete orphaned users
export async function DELETE(request: NextRequest) {
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
    const { userIds, action = 'deactivate' } = body

    // Default to deactivate for safety
    const safeAction = action === 'delete' ? 'delete' : 'deactivate'
    
    // TODO: Implement handleOrphanedUsers method in SyncService
    const result = { success: false, error: 'Method not implemented yet' }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting orphaned users:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete orphaned users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
