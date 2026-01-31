import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 })
    }

    console.log('Testing profile API for user:', userId)

    // Test getUserByClerkId directly
    const { data: user, error } = await UserService.getUserByClerkId(userId)

    if (error || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not found in database',
        details: error,
        userId: userId
      })
    }

    // Simulate what the profile API would return
    const profileResponse = {
      user: {
        id: user.id,
        clerk_user_id: user.clerk_user_id,
        full_name: user.full_name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        department: user.department,
        employee_id: user.employee_id,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
        avatar_url: user.avatar_url,
        is_active: user.is_active
      }
    }

    // Test role-specific profile mapping
    let roleSpecificMapping = {}

    if (user.role === 'ert') {
      roleSpecificMapping = {
        fullName: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '',
        email: user.email || '',
        phone: user.phone || '',
        role: 'Emergency Response Team Lead',
        badgeNumber: user.employee_id || '',
        certifications: user.special_certifications || '',
        yearsOfService: user.years_experience || '',
        currentShift: user.current_shift || '',
        lastLogin: user.last_sign_in_at || '',
        accountCreated: user.created_at || ''
      }
    } else if (user.role === 'transport_company') {
      roleSpecificMapping = {
        companyName: user.full_name || 'Transport Company',
        contactPerson: `${user.first_name || ''} ${user.last_name || ''}`.trim() || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        registrationNumber: user.employee_id || '',
        licenseNumber: user.license_number || '',
        operatingHours: user.current_shift || '24/7',
        serviceArea: user.city || 'Metropolitan Area',
        lastLogin: user.last_sign_in_at || '',
        accountCreated: user.created_at || ''
      }
    }

    // Test profile update
    const testUpdateData = {
      phone: `+123456789${Math.floor(Math.random() * 10)}`,
      bio: `Test update for ${user.role} - ${new Date().toISOString()}`,
      department: user.role === 'ert' ? 'Emergency Response Team' : 'Transport Services'
    }

    const { data: updatedUser, error: updateError } = await UserService.updateUser(user.id, testUpdateData)

    return NextResponse.json({
      success: true,
      message: 'Profile API test completed',
      userId: userId,
      userFound: true,
      userRole: user.role,
      profileResponse: profileResponse,
      roleSpecificMapping: roleSpecificMapping,
      updateTest: {
        success: !updateError,
        error: updateError,
        updateData: testUpdateData,
        updatedUser: updatedUser ? {
          phone: updatedUser.phone,
          bio: updatedUser.bio,
          department: updatedUser.department,
          updated_at: updatedUser.updated_at
        } : null
      }
    })

  } catch (error) {
    console.error('Profile API test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test profile API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
