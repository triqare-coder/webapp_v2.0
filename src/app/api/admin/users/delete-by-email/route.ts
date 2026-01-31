import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check if they're admin
    const client = await clerkClient()
    const currentUser = await client.users.getUser(currentUserId)
    const currentUserRole = currentUser.publicMetadata?.role
    
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, clerk_user_id, email, full_name, role')
      .eq('email', email)
      .single()

    if (findError || !user) {
      return NextResponse.json({ 
        error: 'User not found',
        email: email
      }, { status: 404 })
    }

    console.log(`Found user to delete:`, user)

    // Delete from Clerk first
    try {
      await client.users.deleteUser(user.clerk_user_id)
      console.log(`Deleted user from Clerk: ${user.clerk_user_id}`)
    } catch (clerkError: any) {
      console.error('Error deleting from Clerk:', clerkError)
      // Continue even if Clerk deletion fails (user might not exist in Clerk)
    }

    // Delete from database (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      console.error('Error deleting from database:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete user from database',
        details: deleteError.message
      }, { status: 500 })
    }

    console.log(`Successfully deleted user: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted user: ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Error in delete-by-email:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

