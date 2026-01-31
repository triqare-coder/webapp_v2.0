import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing all profile formats...')

    // Get users with different roles
    const { data: users, error } = await UserService.getUsers({})

    if (error || !users || users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No users found to test with',
        details: error
      }, { status: 400 })
    }

    const testResults = []

    // Test each user role
    for (const user of users) {
      console.log(`Testing profile update for ${user.role} user:`, user.email)

      let updateData: any = {
        // Basic fields that work with current schema
        phone: `+123456789${Math.floor(Math.random() * 10)}`,
        bio: `Updated ${user.role} profile - ${new Date().toISOString()}`,
        department: getDefaultDepartment(user.role),
        employee_id: `EMP${Math.floor(Math.random() * 1000)}`
      }

      // Add role-specific fields
      if (user.role === 'patient') {
        updateData = {
          ...updateData,
          // Extended fields (will be ignored if columns don't exist)
          date_of_birth: '1990-01-01',
          address: '123 Test Street',
          emergency_contact_name: 'Emergency Contact',
          emergency_contact_phone: '+1234567890',
          blood_type: 'O+',
          allergies: 'None',
          medical_conditions: 'Test condition',
          medications: 'Test medication'
        }
      } else if (user.role === 'driver') {
        updateData = {
          ...updateData,
          license_number: `DL${Math.floor(Math.random() * 10000)}`,
          license_class: 'CDL-A',
          years_experience: '5',
          special_certifications: 'Emergency Vehicle Operation',
          current_shift: 'Day Shift',
          vehicle_assigned: 'AMB-001'
        }
      } else if (user.role === 'transport_company') {
        updateData = {
          ...updateData,
          registration_number: `REG${Math.floor(Math.random() * 10000)}`,
          operating_hours: '24/7',
          service_area: 'Metropolitan Area'
        }
      } else if (user.role === 'ert') {
        updateData = {
          ...updateData,
          position: 'Team Lead',
          special_certifications: 'EMT-P, ACLS',
          years_experience: '8',
          current_shift: 'Rotating'
        }
      }

      // Test the update
      const { data: updatedUser, error: updateError } = await UserService.updateUser(user.id, updateData)

      testResults.push({
        userId: user.id,
        email: user.email,
        role: user.role,
        updateData: updateData,
        success: !updateError,
        error: updateError,
        updatedFields: updatedUser ? {
          phone: updatedUser.phone,
          bio: updatedUser.bio,
          department: updatedUser.department,
          employee_id: updatedUser.employee_id,
          updated_at: updatedUser.updated_at
        } : null
      })
    }

    // Summary
    const successCount = testResults.filter(r => r.success).length
    const failureCount = testResults.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: 'Profile format testing completed',
      summary: {
        totalUsers: users.length,
        successfulUpdates: successCount,
        failedUpdates: failureCount,
        successRate: `${Math.round((successCount / users.length) * 100)}%`
      },
      testResults: testResults,
      recommendations: generateRecommendations(testResults)
    })

  } catch (error) {
    console.error('Profile format test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test profile formats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getDefaultDepartment(role: string): string {
  switch (role) {
    case 'admin': return 'Emergency Management'
    case 'ert': return 'Emergency Response Team'
    case 'driver': return 'Transportation'
    case 'transport_company': return 'Transport Services'
    case 'patient': return ''
    default: return 'General'
  }
}

function generateRecommendations(testResults: any[]): string[] {
  const recommendations = []
  
  const failedTests = testResults.filter(r => !r.success)
  if (failedTests.length > 0) {
    recommendations.push('Some profile updates failed - check database schema for missing columns')
    
    const commonErrors = failedTests.map(t => t.error).filter(Boolean)
    if (commonErrors.length > 0) {
      recommendations.push(`Common errors: ${commonErrors.slice(0, 3).join(', ')}`)
    }
  }
  
  if (testResults.every(r => r.success)) {
    recommendations.push('All profile formats are working correctly!')
    recommendations.push('Basic profile fields (phone, bio, department, employee_id) are saving properly')
  }
  
  recommendations.push('Run the SQL script to add missing columns for extended profile fields')
  
  return recommendations
}
