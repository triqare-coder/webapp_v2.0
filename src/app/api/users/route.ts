import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const filters = {
      role: role as 'admin' | 'ert' | 'transport_company' | 'driver' | 'patient' | undefined,
      search: search || undefined,
      limit,
      offset
    }

    const result = await UserService.getUsers(filters)

    if (result.error) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 500 }
      )
    }

    const { data: users, count } = result

    return NextResponse.json({
      users,
      count,
      success: true
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', success: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    const result = await UserService.createUser(userData)

    if (result.error) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user', success: false },
      { status: 500 }
    )
  }
}
