import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'

// POST /api/admin/users/invite - Send invitation to a new user (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { email, role, redirectUrl } = body

    console.log('Received invitation request:', {
      email,
      role,
      redirectUrl
    })

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({
        error: 'Missing required fields: email and role are required'
      }, { status: 400 })
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'ert', 'transport_company', 'patient', 'driver']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    try {
      // Create invitation in Clerk
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-up`,
        publicMetadata: {
          role: role,
          invitedBy: currentUserId,
          invitedAt: new Date().toISOString()
        }
      })

      console.log('Invitation created successfully:', {
        id: invitation.id,
        email: invitation.emailAddress,
        status: invitation.status
      })

      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.emailAddress,
          status: invitation.status,
          role: role,
          createdAt: invitation.createdAt
        },
        message: `Invitation sent successfully to ${email}. They will receive an email with a link to set up their account.`
      })

    } catch (clerkError: any) {
      console.error('Clerk invitation error:', clerkError)

      // Handle email already exists error
      if (clerkError.message?.includes('already exists') || clerkError.message?.includes('duplicate')) {
        return NextResponse.json({
          error: 'A user with this email address already exists or has a pending invitation'
        }, { status: 409 })
      }

      // Handle unprocessable entity (422) - usually validation errors
      if (clerkError.status === 422) {
        return NextResponse.json({
          error: `Failed to create invitation: ${clerkError.message || 'Invalid data provided'}`
        }, { status: 400 })
      }

      return NextResponse.json({
        error: `Failed to create invitation: ${clerkError.message || 'Unknown error'}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/users/invite - List all pending invitations (admin only)
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

    // Get all pending invitations
    const invitations = await clerk.invitations.getInvitationList({
      status: 'pending'
    })

    return NextResponse.json({
      success: true,
      invitations: invitations.data.map(inv => ({
        id: inv.id,
        email: inv.emailAddress,
        status: inv.status,
        role: inv.publicMetadata?.role,
        invitedBy: inv.publicMetadata?.invitedBy,
        invitedAt: inv.publicMetadata?.invitedAt,
        createdAt: inv.createdAt
      }))
    })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

