import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'
import { UserService } from '@/services/userService'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// GET /api/users/[userId]/role - Get user role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth()
    const { userId } = await params
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they're admin
    const currentUser = await clerkClient.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get target user
    const targetUser = await clerkClient.users.getUser(userId)
    const role = targetUser.publicMetadata?.role as UserRole || null

    return NextResponse.json({ 
      userId: targetUser.id,
      role,
      email: targetUser.primaryEmailAddress?.emailAddress,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName
    })
  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/users/[userId]/role - Update user role (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth()
    const { userId } = await params
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check permissions
    const currentUser = await clerkClient.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole

    // Allow self-assignment if user has no role and is updating their own account
    const isSelfAssignment = currentUserId === userId && !currentUserRole

    if (!isSelfAssignment && currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required or self-assignment for users without roles' }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    // Validate role
    const validRoles: UserRole[] = ['admin', 'ert', 'transport_company', 'patient', 'driver']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
      }, { status: 400 })
    }

    // Update user role in Clerk metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role
      },
      unsafeMetadata: {
        role: role // Store role in both public and unsafe for security
      }
    })

    // Also update the role in the database
    const dbUpdateResult = await UserService.updateUserByClerkId(userId, { role })
    if (dbUpdateResult.error) {
      console.error('Failed to update role in database:', dbUpdateResult.error)
      // Continue anyway - Clerk update succeeded, database update failed
      // This ensures the role is at least updated in Clerk
    }

    // Get updated user
    const updatedUser = await clerkClient.users.getUser(userId)

    return NextResponse.json({
      success: true,
      userId: updatedUser.id,
      role: updatedUser.publicMetadata?.role,
      email: updatedUser.primaryEmailAddress?.emailAddress,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      message: `User role updated to ${role}`,
      databaseUpdated: !dbUpdateResult.error
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/users/[userId]/role - Remove user role (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth()
    const { userId } = await params
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they're admin
    const currentUser = await clerkClient.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role as UserRole
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Remove role from user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: null
      }
    })

    // Also remove the role from the database
    const dbUpdateResult = await UserService.updateUserByClerkId(userId, { role: undefined })
    if (dbUpdateResult.error) {
      console.error('Failed to remove role from database:', dbUpdateResult.error)
      // Continue anyway - Clerk update succeeded, database update failed
    }

    // Get updated user
    const updatedUser = await clerkClient.users.getUser(userId)

    return NextResponse.json({
      success: true,
      userId: updatedUser.id,
      role: null,
      email: updatedUser.primaryEmailAddress?.emailAddress,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      message: 'User role removed',
      databaseUpdated: !dbUpdateResult.error
    })
  } catch (error) {
    console.error('Error removing user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
