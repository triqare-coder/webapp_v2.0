import { NextResponse } from 'next/server'
import { createClerkClient } from '@clerk/nextjs/server'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// GET /api/debug/test-clerk - Test Clerk client connection
export async function GET() {
  try {
    // Test basic Clerk client functionality
    const users = await clerkClient.users.getUserList({ limit: 1 })
    
    return NextResponse.json({
      success: true,
      message: 'Clerk client is working',
      userCount: users.totalCount,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10) + '...'
    })
  } catch (error: any) {
    console.error('Clerk client test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10) + '...'
    }, { status: 500 })
  }
}

// POST /api/debug/test-clerk - Test user creation with minimal data
export async function POST() {
  try {
    const testEmail = `test-${Date.now()}@example.com`
    
    console.log('Testing Clerk user creation with:', {
      emailAddress: [testEmail],
      firstName: 'Test',
      lastName: 'User'
    })
    
    const newUser = await clerkClient.users.createUser({
      emailAddress: [testEmail],
      firstName: 'Test',
      lastName: 'User',
      password: `SecureTest${Date.now()}!`, // Required unique password
      publicMetadata: {
        role: 'patient'
      },
      unsafeMetadata: {
        role: 'patient' // Store role in both public and unsafe for security
      }
    })
    
    // Clean up the test user
    await clerkClient.users.deleteUser(newUser.id)
    
    return NextResponse.json({
      success: true,
      message: 'Test user creation successful',
      testEmail,
      userId: newUser.id
    })
  } catch (error: any) {
    console.error('Clerk test user creation error:', error)
    console.error('Error details:', {
      status: error.status,
      message: error.message,
      errors: error.errors,
      clerkTraceId: error.clerkTraceId
    })
    
    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status,
      errors: error.errors,
      clerkTraceId: error.clerkTraceId
    }, { status: 400 })
  }
}
