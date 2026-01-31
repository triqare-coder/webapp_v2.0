import { NextResponse } from 'next/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// POST /api/sync-clerk-to-tables - Sync Clerk users to users table
export async function POST() {
  try {
    console.log('Starting sync from Clerk to users table...')

    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 500,
      orderBy: '-created_at'
    })

    console.log(`Found ${clerkUsers.data.length} users in Clerk`)

    const syncResults = {
      total: clerkUsers.data.length,
      usersTableSynced: 0,
      usersTableErrors: [] as string[],
      skipped: 0
    }

    // Sync each user
    for (const clerkUser of clerkUsers.data) {
      try {
        const email = clerkUser.emailAddresses[0]?.emailAddress
        if (!email) {
          console.log(`Skipping user ${clerkUser.id} - no email address`)
          syncResults.skipped++
          continue
        }

        console.log(`Processing user: ${clerkUser.id} (${email})`)

        const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')
        // Get role from publicMetadata first (admin-set), then unsafeMetadata (user-set), then default
        const role = clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'admin'

        // Prepare user data
        const userData = {
          id: randomUUID(),
          clerk_user_id: clerkUser.id,
          email,
          first_name: clerkUser.firstName || null,
          last_name: clerkUser.lastName || null,
          full_name: fullName || null,
          role,
          avatar_url: clerkUser.imageUrl || null,
          is_active: true,
          last_sign_in_at: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt).toISOString() : null,
          // Get bio and phone from publicMetadata first, then unsafeMetadata
          bio: clerkUser.publicMetadata?.bio || clerkUser.unsafeMetadata?.bio || null,
          phone: clerkUser.publicMetadata?.phone || clerkUser.unsafeMetadata?.phone || null,
          created_at: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // 1. Try to sync to users table
        console.log(`Checking if user exists in users table: ${email}`)
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('clerk_user_id, email')
          .eq('email', email)
          .single()

        if (checkError && !checkError.message?.includes('Cannot coerce the result to a single JSON object')) {
          console.error(`Error checking users table for ${email}:`, checkError)
          syncResults.usersTableErrors.push(`Error checking user ${email}: ${checkError.message}`)
        } else if (!existingUser) {
          // User doesn't exist in users table, try to insert
          console.log(`User ${email} not found in users table, attempting insert...`)
          
          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single()

          if (insertError) {
            console.error(`Failed to insert user ${email} into users table:`, insertError)
            syncResults.usersTableErrors.push(`Failed to insert ${email}: ${insertError.message}`)
          } else {
            console.log(`Successfully inserted user ${email} into users table`)
            syncResults.usersTableSynced++
          }
        } else {
          console.log(`User ${email} already exists in users table`)
        }

        // User successfully synced to users table

      } catch (error) {
        console.error(`Unexpected error processing user ${clerkUser.id}:`, error)
        syncResults.usersTableErrors.push(`Unexpected error for ${clerkUser.id}: ${error}`)
      }
    }

    console.log('Comprehensive sync completed:', syncResults)

    // Get final counts for verification
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: `Sync completed. ${syncResults.usersTableSynced} users synced to users table.`,
      results: {
        ...syncResults,
        finalCounts: {
          clerkUsers: clerkUsers.data.length,
          usersTable: usersCount || 0
        }
      }
    })

  } catch (error) {
    console.error('Comprehensive sync error:', error)
    return NextResponse.json({
      success: false,
      error: 'Comprehensive sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET /api/sync-clerk-to-tables - Get sync status for both tables
export async function GET() {
  try {
    console.log('Checking comprehensive sync status...')

    // Get Clerk user count
    const clerkUsers = await clerkClient.users.getUserList({ limit: 1 })
    const clerkCount = clerkUsers.totalCount

    // Get users table count
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get user_records table count
    const { count: userRecordsCount, error: userRecordsError } = await supabase
      .from('user_records')
      .select('*', { count: 'exact', head: true })

    const status = {
      clerkUsers: clerkCount,
      usersTable: {
        count: usersCount || 0,
        error: usersError?.message || null,
        inSync: (usersCount || 0) >= clerkCount
      },
      userRecordsTable: {
        count: userRecordsCount || 0,
        error: userRecordsError?.message || null,
        inSync: (userRecordsCount || 0) >= clerkCount
      },
      overallSync: (usersCount || 0) >= clerkCount || (userRecordsCount || 0) >= clerkCount,
      lastCheck: new Date().toISOString()
    }

    console.log('Sync status:', status)

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('Error checking sync status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
