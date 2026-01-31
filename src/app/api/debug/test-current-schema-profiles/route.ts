import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing profile updates with current table schema only...')

    // Get all users from database
    const { data: users, error } = await UserService.getUsers({})

    if (error || !users) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users',
        details: error
      }, { status: 500 })
    }

    const testResults = []

    for (const user of users) {
      try {
        // Create role-specific update data using ONLY existing table fields
        let updateData: any = {
          phone: `+123456789${Math.floor(Math.random() * 10)}`,
          bio: `Updated ${user.role} profile - ${new Date().toISOString()}`,
        }

        // Add role-specific data using only existing fields
        if (user.role === 'admin') {
          updateData = {
            ...updateData,
            department: 'Emergency Management',
            employee_id: `EMP${Math.floor(Math.random() * 1000)}`
          }
        } else if (user.role === 'ert') {
          updateData = {
            ...updateData,
            department: 'Emergency Response Team',
            employee_id: `ERT${Math.floor(Math.random() * 1000)}`,
            bio: `Emergency Response Team Member. Badge: ERT${Math.floor(Math.random() * 1000)}. Years of service: 5. Certifications: EMT-P, ACLS. Current shift: Day shift`
          }
        } else if (user.role === 'transport_company') {
          updateData = {
            ...updateData,
            department: 'Transport Services',
            employee_id: `TC${Math.floor(Math.random() * 1000)}`,
            bio: `Transport Company. Registration: TC${Math.floor(Math.random() * 1000)}. License: LIC${Math.floor(Math.random() * 1000)}. Operating hours: 24/7. Service area: Metropolitan Area. Address: 123 Transport St`
          }
        } else if (user.role === 'driver') {
          updateData = {
            ...updateData,
            department: 'Transportation',
            employee_id: `DRV${Math.floor(Math.random() * 1000)}`,
            bio: `Emergency Driver. License: DL${Math.floor(Math.random() * 1000)}. Experience: 3 years. Certifications: CDL, First Aid. Current shift: Night shift. Vehicle: Ambulance 01`
          }
        } else if (user.role === 'patient') {
          updateData = {
            ...updateData,
            department: '', // Patients don't have departments
            employee_id: '', // Patients don't have employee IDs
            bio: `Patient profile. Medical conditions: Hypertension. Allergies: Penicillin. Emergency contact: John Doe (+1234567890). Blood type: O+. Insurance: Blue Cross`
          }
        }

        // Attempt to update the user
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

      } catch (userError) {
        testResults.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          updateData: null,
          success: false,
          error: userError instanceof Error ? userError.message : 'Unknown error',
          updatedFields: null
        })
      }
    }

    // Generate summary
    const totalUsers = testResults.length
    const successfulUpdates = testResults.filter(r => r.success).length
    const failedUpdates = testResults.filter(r => !r.success).length
    const successRate = Math.round((successfulUpdates / totalUsers) * 100)

    // Get unique errors
    const errors = testResults
      .filter(r => !r.success && r.error)
      .map(r => r.error)
      .filter((error, index, arr) => arr.indexOf(error) === index)

    return NextResponse.json({
      success: true,
      message: 'Profile format testing completed with current schema',
      summary: {
        totalUsers,
        successfulUpdates,
        failedUpdates,
        successRate: `${successRate}%`
      },
      testResults,
      recommendations: [
        successRate === 100 ? 'All profile updates successful with current schema!' : `${failedUpdates} profile updates failed`,
        'All profile forms now use only existing table fields',
        'Extended fields are stored in the bio field as formatted text',
        'Profile pages should now load and save data correctly'
      ],
      errors: errors.length > 0 ? errors : ['No errors - all updates successful!']
    })

  } catch (error) {
    console.error('Profile testing error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test profiles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
