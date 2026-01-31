import { clerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@/types'

export interface InvitationResult {
  success: boolean
  invitationId?: string
  email: string
  error?: string
}

/**
 * Send a Clerk invitation to a user
 * @param email - User's email address
 * @param role - User's role (admin, ert, transport_company, patient, driver)
 * @param invitedBy - Clerk user ID of the admin who sent the invitation
 * @returns InvitationResult with success status and invitation ID or error
 */
export async function sendUserInvitation(
  email: string,
  role: UserRole,
  invitedBy?: string
): Promise<InvitationResult> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        email,
        error: 'Invalid email format'
      }
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'ert', 'transport_company', 'patient', 'driver']
    if (!validRoles.includes(role)) {
      return {
        success: false,
        email,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      }
    }

    const clerk = await clerkClient()

    // Check if user already exists in Clerk
    const existingUsers = await clerk.users.getUserList({
      emailAddress: [email]
    })

    if (existingUsers.data.length > 0) {
      return {
        success: false,
        email,
        error: 'User already exists in Clerk'
      }
    }

    // Create invitation
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-up`,
      publicMetadata: {
        role: role,
        invitedBy: invitedBy || 'csv_import',
        invitedAt: new Date().toISOString(),
        source: 'csv_import'
      }
    })

    return {
      success: true,
      invitationId: invitation.id,
      email
    }
  } catch (error) {
    console.error('Error sending invitation:', error)
    return {
      success: false,
      email,
      error: error instanceof Error ? error.message : 'Failed to send invitation'
    }
  }
}

/**
 * Send bulk invitations for CSV import
 * @param users - Array of users with email and role
 * @param invitedBy - Clerk user ID of the admin who initiated the import
 * @returns Array of invitation results
 */
export async function sendBulkInvitations(
  users: Array<{ email: string; role: UserRole }>,
  invitedBy?: string
): Promise<InvitationResult[]> {
  const results: InvitationResult[] = []

  for (const user of users) {
    const result = await sendUserInvitation(user.email, user.role, invitedBy)
    results.push(result)
  }

  return results
}

