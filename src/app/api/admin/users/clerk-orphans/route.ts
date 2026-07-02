import { NextRequest, NextResponse } from 'next/server'
import { auth, createClerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { UserRole } from '@/types'
import { randomUUID } from 'crypto'

// Clerk-only orphans: accounts that exist in Clerk (the auth provider) but have
// NO row in the Supabase `users` table. The admin "All Users" list reads from
// `users`, so these accounts are otherwise invisible in the dashboard — yet they
// still block re-registration ("That email is already registered"). This is the
// inverse of /api/admin/users/orphaned (DB rows with no Clerk account).

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }
  const currentUser = await clerkClient.users.getUser(userId)
  if ((currentUser.publicMetadata?.role as UserRole) !== 'admin') {
    return { ok: false, status: 403, error: 'Forbidden - Admin access required' }
  }
  return { ok: true }
}

// GET /api/admin/users/clerk-orphans - Find Clerk users with no `users` row
export async function GET() {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const clerkUsers = await clerkClient.users.getUserList({
      limit: 500,
      orderBy: '-created_at',
    })

    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('clerk_user_id, email')

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to read users table: ${dbError.message}` },
        { status: 500 }
      )
    }

    // Match on either the Clerk ID or the email, so a row created without a
    // clerk_user_id (or vice-versa) is not falsely reported as an orphan.
    const dbClerkIds = new Set((dbUsers || []).map((u) => u.clerk_user_id).filter(Boolean))
    const dbEmails = new Set(
      (dbUsers || []).map((u) => (u.email || '').toLowerCase()).filter(Boolean)
    )

    const orphans = clerkUsers.data
      .filter((cu) => {
        const email = cu.emailAddresses[0]?.emailAddress?.toLowerCase()
        const inDbById = dbClerkIds.has(cu.id)
        const inDbByEmail = email ? dbEmails.has(email) : false
        return !inDbById && !inDbByEmail
      })
      .map((cu) => ({
        clerk_user_id: cu.id,
        email: cu.emailAddresses[0]?.emailAddress || null,
        full_name: [cu.firstName, cu.lastName].filter(Boolean).join(' ') || null,
        role: (cu.publicMetadata?.role || cu.unsafeMetadata?.role || 'patient') as string,
        created_at: cu.createdAt ? new Date(cu.createdAt).toISOString() : null,
        last_sign_in_at: cu.lastSignInAt ? new Date(cu.lastSignInAt).toISOString() : null,
      }))

    return NextResponse.json({
      success: true,
      data: {
        count: orphans.length,
        users: orphans,
        totalClerk: clerkUsers.data.length,
        totalDatabase: (dbUsers || []).length,
      },
    })
  } catch (error) {
    console.error('Error finding Clerk-only orphaned users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users/clerk-orphans - Import selected orphans into the users
// table (the fix), or delete them from Clerk. Body: { action, clerkUserIds }.
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json()
    const { action, clerkUserIds } = body as {
      action: 'import' | 'delete'
      clerkUserIds: string[]
    }

    if (!clerkUserIds || !Array.isArray(clerkUserIds) || clerkUserIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'clerkUserIds array is required' },
        { status: 400 }
      )
    }
    if (action !== 'import' && action !== 'delete') {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be: import or delete' },
        { status: 400 }
      )
    }

    const results = { processed: 0, imported: 0, deleted: 0, errors: [] as string[] }

    for (const clerkUserId of clerkUserIds) {
      try {
        if (action === 'delete') {
          await clerkClient.users.deleteUser(clerkUserId)
          results.deleted++
          results.processed++
          continue
        }

        // action === 'import'
        const clerkUser = await clerkClient.users.getUser(clerkUserId)
        const email = clerkUser.emailAddresses[0]?.emailAddress
        if (!email) {
          results.errors.push(`${clerkUserId}: no email address in Clerk`)
          continue
        }

        // Guard against races / double-clicks: skip if a row now exists.
        const { data: existingById } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle()
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (existingById || existingByEmail) {
          results.errors.push(`${email}: already in database (skipped)`)
          continue
        }

        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')
        // Default to 'patient' (not 'admin') — an unknown orphan must never be
        // imported with elevated privileges. Honour an explicit metadata role.
        const role = clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'patient'

        const { error: insertError } = await supabase.from('users').insert([
          {
            id: randomUUID(),
            clerk_user_id: clerkUser.id,
            email,
            first_name: clerkUser.firstName || null,
            last_name: clerkUser.lastName || null,
            full_name: fullName || null,
            role,
            avatar_url: clerkUser.imageUrl || null,
            is_active: true,
            last_sign_in_at: clerkUser.lastSignInAt
              ? new Date(clerkUser.lastSignInAt).toISOString()
              : null,
            created_at: clerkUser.createdAt
              ? new Date(clerkUser.createdAt).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        if (insertError) {
          results.errors.push(`${email}: ${insertError.message}`)
        } else {
          results.imported++
          results.processed++
        }
      } catch (err: any) {
        results.errors.push(`${clerkUserId}: ${err?.message || 'Unknown error'}`)
      }
    }

    const verb = action === 'import' ? 'imported to database' : 'deleted from Clerk'
    return NextResponse.json({
      success: true,
      message:
        `Processed ${results.processed} account(s) ${verb}.` +
        (results.errors.length ? ` ${results.errors.length} skipped/failed.` : ''),
      results,
    })
  } catch (error) {
    console.error('Error processing Clerk-only orphaned users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
