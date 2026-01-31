import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing profile update...')

    // Get the first user from the database to test with
    const { data: users, error: getUsersError } = await UserService.getUsers({ limit: 1 })

    if (getUsersError || !users || users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No users found to test with',
        details: getUsersError
      }, { status: 400 })
    }

    const testUser = users[0]
    console.log('Testing with user:', testUser.id, testUser.email)

    // Test updating the user's profile
    const updateData = {
      phone: '+1234567890',
      bio: 'Updated bio from test - ' + new Date().toISOString(),
      department: 'Test Department',
      employee_id: 'TEST123'
    }

    const { data: updatedUser, error: updateError } = await UserService.updateUser(testUser.id, updateData)

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update user',
        details: updateError
      }, { status: 500 })
    }

    // Verify the update by fetching the user again
    const { data: verifyUser, error: verifyError } = await UserService.getUserById(testUser.id)

    return NextResponse.json({
      success: true,
      message: 'Profile update test completed successfully',
      originalUser: {
        id: testUser.id,
        email: testUser.email,
        phone: testUser.phone,
        bio: testUser.bio,
        department: testUser.department,
        employee_id: testUser.employee_id
      },
      updateData,
      updatedUser: updatedUser ? {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        department: updatedUser.department,
        employee_id: updatedUser.employee_id,
        updated_at: updatedUser.updated_at
      } : null,
      verificationUser: verifyUser ? {
        id: verifyUser.id,
        email: verifyUser.email,
        phone: verifyUser.phone,
        bio: verifyUser.bio,
        department: verifyUser.department,
        employee_id: verifyUser.employee_id,
        updated_at: verifyUser.updated_at
      } : null,
      verifyError
    })

  } catch (error) {
    console.error('Profile update test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test profile update',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
