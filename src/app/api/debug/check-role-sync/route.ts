import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'
import { createClerkClient } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Checking role synchronization between Clerk and Database...')

    // Get all users from database
    const { data: dbUsers, error } = await UserService.getUsers({})

    if (error || !dbUsers) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch database users',
        details: error
      }, { status: 500 })
    }

    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    const roleComparisons = []

    for (const dbUser of dbUsers) {
      try {
        // Get corresponding Clerk user
        const clerkUser = await clerkClient.users.getUser(dbUser.clerk_user_id)
        
        const comparison = {
          userId: dbUser.clerk_user_id,
          email: dbUser.email,
          databaseRole: dbUser.role,
          clerkPublicRole: clerkUser.publicMetadata?.role || null,
          clerkPrivateRole: clerkUser.privateMetadata?.role || null,
          clerkEmailPattern: getEmailRolePattern(clerkUser.emailAddresses[0]?.emailAddress || ''),
          roleMatch: false,
          recommendedAction: ''
        }

        // Check if roles match
        const clerkRole = comparison.clerkPublicRole || comparison.clerkPrivateRole || comparison.clerkEmailPattern
        comparison.roleMatch = comparison.databaseRole === clerkRole

        if (!comparison.roleMatch) {
          comparison.recommendedAction = `Update Clerk metadata to role: ${comparison.databaseRole}`
        } else {
          comparison.recommendedAction = 'Roles are synchronized'
        }

        roleComparisons.push(comparison)

      } catch (clerkError) {
        roleComparisons.push({
          userId: dbUser.clerk_user_id,
          email: dbUser.email,
          databaseRole: dbUser.role,
          clerkPublicRole: 'ERROR',
          clerkPrivateRole: 'ERROR',
          clerkEmailPattern: 'ERROR',
          roleMatch: false,
          recommendedAction: `Failed to fetch Clerk user: ${clerkError instanceof Error ? clerkError.message : 'Unknown error'}`,
          error: clerkError instanceof Error ? clerkError.message : 'Unknown error'
        })
      }
    }

    // Generate summary
    const totalUsers = roleComparisons.length
    const syncedUsers = roleComparisons.filter(c => c.roleMatch).length
    const unsyncedUsers = roleComparisons.filter(c => !c.roleMatch).length

    // Generate fix actions for unsynced users
    const fixActions = []
    for (const comparison of roleComparisons) {
      if (!comparison.roleMatch) {
        fixActions.push({
          userId: comparison.userId,
          email: comparison.email,
          action: 'updateClerkRole',
          currentClerkRole: comparison.clerkPublicRole || comparison.clerkPrivateRole || 'none',
          targetRole: comparison.databaseRole,
          curlCommand: `curl -X PUT "http://localhost:3001/api/debug/fix-user-role" -H "Content-Type: application/json" -d '{"userId":"${comparison.userId}","role":"${comparison.databaseRole}"}'`
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Role synchronization check completed',
      summary: {
        totalUsers,
        syncedUsers,
        unsyncedUsers,
        syncRate: `${Math.round((syncedUsers / totalUsers) * 100)}%`
      },
      roleComparisons,
      fixActions,
      recommendations: [
        unsyncedUsers > 0 ? `${unsyncedUsers} users have mismatched roles between Clerk and Database` : 'All user roles are synchronized',
        'ERT and Transport profile pages may not load if Clerk roles don\'t match database roles',
        'Use the fix actions below to synchronize roles',
        'After fixing roles, users should be able to access their profile pages'
      ]
    })

  } catch (error) {
    console.error('Role sync check error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check role synchronization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getEmailRolePattern(email: string): string | null {
  if (email.includes('admin')) return 'admin'
  if (email.includes('ert')) return 'ert'
  if (email.includes('transport')) return 'transport_company'
  if (email.includes('patient')) return 'patient'
  if (email.includes('driver')) return 'driver'
  return null
}
