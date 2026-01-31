import { NextResponse } from 'next/server'
import { MockUserStore } from '@/lib/mockUserStore'
import { auth } from '@clerk/nextjs/server'

// GET /api/debug/mock-store - Check what's in the mock store
export async function GET() {
  try {
    const { userId } = await auth()
    
    const allUsers = MockUserStore.getAllUsers()
    const userCount = MockUserStore.getUserCount()
    const currentUserInStore = userId ? MockUserStore.getUserByClerkId(userId) : null
    
    return NextResponse.json({
      success: true,
      currentUserId: userId,
      userCount,
      currentUserInStore: currentUserInStore ? 'Found' : 'Not found',
      allUsers: allUsers.map(user => ({
        id: user.id,
        clerk_user_id: user.clerk_user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }))
    })
  } catch (error) {
    console.error('Error checking mock store:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
