import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get users from Supabase
    const supabase = await createClient()
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (role) {
      query = query.eq('role', role)
    }
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich users with Clerk status
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user) => {
        try {
          if (user.clerk_user_id) {
            const clerkUser = await client.users.getUser(user.clerk_user_id)
            return {
              ...user,
              banned: clerkUser.banned || false,
              lastSignInAt: clerkUser.lastSignInAt,
              createdAt: clerkUser.createdAt
            }
          }
          return {
            ...user,
            banned: false
          }
        } catch (err) {
          // If Clerk user not found, mark as potentially deleted
          console.error(`Clerk user not found for ${user.email}:`, err)
          return {
            ...user,
            banned: false,
            clerkUserNotFound: true
          }
        }
      })
    )

    return NextResponse.json({
      data: enrichedUsers,
      count: count || 0
    })

  } catch (error: any) {
    console.error('Error fetching users with status:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch users' 
    }, { status: 500 })
  }
}

