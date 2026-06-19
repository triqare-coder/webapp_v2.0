import { NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

// GET /api/users/stats - aggregate user statistics (admin dashboard)
export async function GET() {
  try {
    const result = await UserService.getUserStats()

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ stats: result.data })
  } catch (error) {
    console.error('Error in GET /api/users/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
