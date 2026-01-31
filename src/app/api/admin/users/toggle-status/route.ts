import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const client = await clerkClient()
    const currentUser = await client.users.getUser(userId)
    const userRole = currentUser.publicMetadata?.role
    
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { clerkUserId, action } = body

    if (!clerkUserId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: clerkUserId and action' 
      }, { status: 400 })
    }

    if (action !== 'ban' && action !== 'unban') {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "ban" or "unban"' 
      }, { status: 400 })
    }

    // Prevent admin from banning themselves
    if (clerkUserId === userId) {
      return NextResponse.json({ 
        error: 'You cannot deactivate your own account' 
      }, { status: 400 })
    }

    // Get the target user
    const targetUser = await client.users.getUser(clerkUserId)
    
    // Prevent banning other admins
    if (targetUser.publicMetadata?.role === 'admin' && action === 'ban') {
      return NextResponse.json({ 
        error: 'Cannot deactivate admin accounts' 
      }, { status: 403 })
    }

    // Perform the action
    if (action === 'ban') {
      await client.users.banUser(clerkUserId)
    } else {
      await client.users.unbanUser(clerkUserId)
    }

    return NextResponse.json({
      success: true,
      message: action === 'ban' ? 'User deactivated successfully' : 'User activated successfully',
      action,
      userId: clerkUserId
    })

  } catch (error: any) {
    console.error('Error toggling user status:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update user status' 
    }, { status: 500 })
  }
}

