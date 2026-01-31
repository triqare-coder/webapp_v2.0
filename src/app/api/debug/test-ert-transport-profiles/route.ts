import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/userService'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing ERT and Transport profile loading...')

    // Get ERT and Transport users
    const { data: users, error } = await UserService.getUsers({})

    if (error || !users) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users',
        details: error
      }, { status: 500 })
    }

    const ertUser = users.find(u => u.role === 'ert')
    const transportUser = users.find(u => u.role === 'transport_company')

    const results = {
      ertUser: null as any,
      transportUser: null as any,
      ertProfileTest: null as any,
      transportProfileTest: null as any
    }

    // Test ERT user
    if (ertUser) {
      results.ertUser = {
        id: ertUser.id,
        clerk_user_id: ertUser.clerk_user_id,
        email: ertUser.email,
        full_name: ertUser.full_name,
        first_name: ertUser.first_name,
        last_name: ertUser.last_name,
        role: ertUser.role,
        phone: ertUser.phone,
        bio: ertUser.bio,
        department: ertUser.department,
        employee_id: ertUser.employee_id,
        created_at: ertUser.created_at,
        last_sign_in_at: ertUser.last_sign_in_at
      }

      // Test profile data mapping for ERT
      results.ertProfileTest = {
        fullName: ertUser.full_name || `${ertUser.first_name || ''} ${ertUser.last_name || ''}`.trim() || '',
        email: ertUser.email || '',
        phone: ertUser.phone || '',
        role: 'Emergency Response Team Lead',
        badgeNumber: ertUser.employee_id || '',
        certifications: ertUser.special_certifications || '',
        yearsOfService: ertUser.years_experience || '',
        currentShift: ertUser.current_shift || '',
        lastLogin: ertUser.last_sign_in_at || '',
        accountCreated: ertUser.created_at || ''
      }
    }

    // Test Transport user
    if (transportUser) {
      results.transportUser = {
        id: transportUser.id,
        clerk_user_id: transportUser.clerk_user_id,
        email: transportUser.email,
        full_name: transportUser.full_name,
        first_name: transportUser.first_name,
        last_name: transportUser.last_name,
        role: transportUser.role,
        phone: transportUser.phone,
        bio: transportUser.bio,
        department: transportUser.department,
        employee_id: transportUser.employee_id,
        created_at: transportUser.created_at,
        last_sign_in_at: transportUser.last_sign_in_at
      }

      // Test profile data mapping for Transport
      results.transportProfileTest = {
        companyName: transportUser.full_name || 'Transport Company',
        contactPerson: `${transportUser.first_name || ''} ${transportUser.last_name || ''}`.trim() || '',
        email: transportUser.email || '',
        phone: transportUser.phone || '',
        address: transportUser.address || '',
        registrationNumber: transportUser.employee_id || '',
        licenseNumber: transportUser.license_number || '',
        operatingHours: transportUser.current_shift || '24/7',
        serviceArea: transportUser.city || 'Metropolitan Area',
        lastLogin: transportUser.last_sign_in_at || '',
        accountCreated: transportUser.created_at || ''
      }
    }

    // Test profile updates
    const updateTests = []

    if (ertUser) {
      const ertUpdateData = {
        first_name: 'ERT',
        last_name: 'Member',
        full_name: 'ERT Member',
        phone: '+1234567890',
        bio: 'Emergency Response Team Member - Test Update',
        department: 'Emergency Response Team',
        employee_id: 'ERT001'
      }

      const { data: updatedErt, error: ertUpdateError } = await UserService.updateUser(ertUser.id, ertUpdateData)
      updateTests.push({
        role: 'ert',
        userId: ertUser.id,
        updateData: ertUpdateData,
        success: !ertUpdateError,
        error: ertUpdateError,
        result: updatedErt
      })
    }

    if (transportUser) {
      const transportUpdateData = {
        first_name: 'Transport',
        last_name: 'Company',
        full_name: 'Transport Company Ltd',
        phone: '+1234567891',
        bio: 'Transport Company serving Metropolitan Area',
        department: 'Transport Services',
        employee_id: 'TC001'
      }

      const { data: updatedTransport, error: transportUpdateError } = await UserService.updateUser(transportUser.id, transportUpdateData)
      updateTests.push({
        role: 'transport_company',
        userId: transportUser.id,
        updateData: transportUpdateData,
        success: !transportUpdateError,
        error: transportUpdateError,
        result: updatedTransport
      })
    }

    return NextResponse.json({
      success: true,
      message: 'ERT and Transport profile testing completed',
      foundUsers: {
        ert: !!ertUser,
        transport: !!transportUser
      },
      results: results,
      updateTests: updateTests,
      recommendations: [
        ertUser ? 'ERT user found and can be updated' : 'No ERT user found in database',
        transportUser ? 'Transport user found and can be updated' : 'No Transport user found in database',
        'Profile forms should load data from these database records',
        'Basic fields (name, email, phone, bio, department, employee_id) should work',
        'Extended fields will work when database columns are added'
      ]
    })

  } catch (error) {
    console.error('ERT/Transport profile test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test ERT/Transport profiles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
