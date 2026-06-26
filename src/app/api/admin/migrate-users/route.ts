import { NextRequest, NextResponse } from 'next/server'
import { SyncService } from '@/services/syncService'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// API endpoint to migrate direct auth users to Clerk (ADMIN ONLY).
// This privileged bootstrap/migration action was previously reachable unauthenticated;
// it now requires an admin session (defense-in-depth at the handler level).
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    console.log('🚀 Starting user migration from direct auth to Clerk...')

    // Migrate direct auth users to Clerk
    const migrationResult = await SyncService.migrateDirectAuthUsersToClerk()

    // Generate sync report after migration
    const syncReport = await SyncService.generateSyncReport()

    const response = {
      success: true,
      migration: {
        migrated_users: migrationResult.success,
        migration_errors: migrationResult.errors
      },
      sync_report: syncReport,
      message: `Successfully migrated ${migrationResult.success} users to Clerk`
    }

    console.log('✅ Migration completed successfully')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Failed to migrate users to Clerk'
      },
      { status: 500 }
    )
  }
}

// Get migration status (ADMIN ONLY)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    // Check for users that need migration
    const { data: directAuthUsers, error } = await supabase
      .from('users')
      .select('id, email, role, bio, clerk_user_id')
      .like('bio', 'temp_password:%')

    if (error) throw error

    const needsMigration = directAuthUsers?.filter(u => !u.clerk_user_id) || []
    const alreadyMigrated = directAuthUsers?.filter(u => u.clerk_user_id) || []

    // Generate current sync report
    const syncReport = await SyncService.generateSyncReport()

    return NextResponse.json({
      success: true,
      migration_status: {
        needs_migration: needsMigration.length,
        already_migrated: alreadyMigrated.length,
        users_needing_migration: needsMigration.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role
        }))
      },
      sync_report: syncReport
    })

  } catch (error: any) {
    console.error('❌ Failed to get migration status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
