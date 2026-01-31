import { NextRequest, NextResponse } from 'next/server'
import { AutoSyncService } from '@/services/autoSyncService'

// Trigger automatic background sync for unsynced users
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting automatic background sync...')

    const result = await AutoSyncService.syncUnsyncedUsers()

    const response = {
      success: true,
      synced_users: result.synced,
      errors: result.errors,
      message: `Background sync completed: ${result.synced} users synced${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
    }

    console.log('✅ Background sync completed')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Background sync failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Background sync failed'
      },
      { status: 500 }
    )
  }
}

// Get sync status
export async function GET(req: NextRequest) {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    // Count users by sync status
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, email, clerk_user_id, is_active')
      .eq('is_active', true)

    if (allError) throw allError

    const syncedUsers = allUsers?.filter(u => u.clerk_user_id) || []
    const unsyncedUsers = allUsers?.filter(u => !u.clerk_user_id) || []

    return NextResponse.json({
      success: true,
      sync_status: {
        total_active_users: allUsers?.length || 0,
        synced_users: syncedUsers.length,
        unsynced_users: unsyncedUsers.length,
        sync_percentage: allUsers?.length ? Math.round((syncedUsers.length / allUsers.length) * 100) : 0
      },
      unsynced_user_emails: unsyncedUsers.map(u => u.email),
      message: `${syncedUsers.length}/${allUsers?.length || 0} users are synced with Clerk`
    })

  } catch (error: any) {
    console.error('❌ Failed to get sync status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
