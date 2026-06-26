import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// POST /api/admin/create-initial-user - Create the initial admin user bypassing RLS.
//
// SECURITY: this one-time bootstrap endpoint creates an ADMIN user. Previously it was
// reachable by anyone (public allow-list), which let an unauthenticated caller create an
// admin account. It is now:
//   • blocked entirely in production (use the seed:test service-role script to bootstrap), and
//   • gated behind an existing admin session in non-production environments.
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Disabled in production' },
      { status: 403 }
    )
  }

  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    // This is a one-time setup endpoint to create the initial admin user
    const clerkUserId = 'user_32jB3X5Rt2Gqg2EY5oGAi5R38kb' // Replace with actual Clerk user ID

    // First, check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists',
        user: existingUser
      })
    }

    // Try to create the user using a direct SQL query with explicit UUID
    const userId = randomUUID()
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        clerk_user_id: clerkUserId,
        email: 'admin@emergency.com',
        first_name: 'System',
        last_name: 'Administrator',
        full_name: 'System Administrator',
        role: 'admin'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating initial admin user:', error)
      return NextResponse.json({
        error: 'Failed to create initial admin user',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Initial admin user created successfully',
      user: data
    })
  } catch (error) {
    console.error('Error in create-initial-user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
