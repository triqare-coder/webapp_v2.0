import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// SECURITY: orchestrates the full DB bootstrap by calling other setup/fix
// endpoints. Admin-only.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    console.log('🚀 Starting comprehensive database setup...')

    const results = []
    const baseUrl = request.nextUrl.origin

    // Step 1: Clean up user_records table
    console.log('Step 1: Cleaning up user_records table...')
    try {
      const cleanupResponse = await fetch(`${baseUrl}/api/admin/cleanup-user-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const cleanupResult = await cleanupResponse.json()
      results.push({
        step: 'Cleanup user_records table',
        success: cleanupResult.success,
        details: cleanupResult.results || cleanupResult.error
      })
    } catch (error) {
      results.push({
        step: 'Cleanup user_records table',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Step 2: Fix foreign key constraints
    console.log('Step 2: Fixing foreign key constraints...')
    try {
      const fkResponse = await fetch(`${baseUrl}/api/admin/fix-foreign-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const fkResult = await fkResponse.json()
      results.push({
        step: 'Fix foreign key constraints',
        success: fkResult.success,
        details: fkResult.results || fkResult.error
      })
    } catch (error) {
      results.push({
        step: 'Fix foreign key constraints',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Step 3: Setup RLS policies on users table
    console.log('Step 3: Setting up RLS policies on users table...')
    try {
      const rlsResponse = await fetch(`${baseUrl}/api/admin/setup-users-table-rls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const rlsResult = await rlsResponse.json()
      results.push({
        step: 'Setup users table RLS',
        success: rlsResult.success,
        details: rlsResult.results || rlsResult.error
      })
    } catch (error) {
      results.push({
        step: 'Setup users table RLS',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Step 4: Sync Clerk users to users table
    console.log('Step 4: Syncing Clerk users to users table...')
    try {
      const syncResponse = await fetch(`${baseUrl}/api/sync-clerk-to-tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const syncResult = await syncResponse.json()
      results.push({
        step: 'Sync Clerk users',
        success: syncResult.success,
        details: syncResult.results || syncResult.error
      })
    } catch (error) {
      results.push({
        step: 'Sync Clerk users',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Calculate overall success
    const successfulSteps = results.filter(r => r.success).length
    const totalSteps = results.length
    const overallSuccess = successfulSteps === totalSteps

    return NextResponse.json({
      success: overallSuccess,
      message: `Database setup completed. ${successfulSteps}/${totalSteps} steps successful.`,
      summary: {
        totalSteps,
        successfulSteps,
        failedSteps: totalSteps - successfulSteps
      },
      results: results,
      nextSteps: overallSuccess ? [
        '✅ Database is now using only the users table',
        '✅ Foreign key constraints are fixed',
        '✅ RLS policies are in place',
        '✅ Clerk users are synced',
        '🎉 Google OAuth role assignment should work perfectly!'
      ] : [
        '⚠️ Some steps failed - check the results above',
        '📝 You may need to run the SQL commands manually in Supabase SQL Editor',
        '🔧 Check the instructions in each failed step'
      ]
    })

  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
