import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// GET /api/users/roles - Get all users with their roles (admin only)
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as UserRole | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get users from Clerk
    const usersResponse = await clerkClient.users.getUserList({
      limit,
      offset,
      orderBy: '-created_at'
    })

    // Filter and format users
    const users = usersResponse.data
      .map(user => ({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        role: user.publicMetadata?.role as UserRole || null,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        imageUrl: user.imageUrl
      }))
      .filter(user => {
        // Filter by role if specified
        if (role && user.role !== role) return false
        return true
      })

    // Get role statistics
    const roleStats = {
      admin: users.filter(u => u.role === 'admin').length,
      ert: users.filter(u => u.role === 'ert').length,
      transport_company: users.filter(u => u.role === 'transport_company').length,
      patient: users.filter(u => u.role === 'patient').length,
      driver: users.filter(u => u.role === 'driver').length,
      unassigned: users.filter(u => !u.role).length,
      total: users.length
    }

    return NextResponse.json({
      users,
      pagination: {
        total: usersResponse.totalCount,
        limit,
        offset,
        hasMore: (offset + limit) < usersResponse.totalCount
      },
      roleStats
    })
  } catch (error) {
    console.error('Error fetching users with roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/users/roles - Bulk update user roles (admin only)
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

    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 })
    }

    const validRoles: UserRole[] = ['admin', 'ert', 'transport_company', 'patient', 'driver']
    const results = []

    // Process each update
    for (const update of updates) {
      const { userId, role } = update

      if (!userId) {
        results.push({ userId, error: 'User ID is required' })
        continue
      }

      if (role && !validRoles.includes(role)) {
        results.push({ userId, error: 'Invalid role' })
        continue
      }

      try {
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            role: role || null
          },
          unsafeMetadata: {
            role: role || null // Store role in both public and unsafe for security
          }
        })
        results.push({ userId, success: true, role })
      } catch (error) {
        results.push({ userId, error: 'Failed to update user' })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${updates.length} role updates`
    })
  } catch (error) {
    console.error('Error bulk updating user roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
