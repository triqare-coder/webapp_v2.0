import { NextRequest, NextResponse } from 'next/server'
import { AutoSyncService } from '@/services/autoSyncService'

// Cron job endpoint for automatic user synchronization
// This can be called by external cron services like Vercel Cron or GitHub Actions
export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Cron job: Starting automatic user sync...')

    const result = await AutoSyncService.syncUnsyncedUsers()

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      synced_users: result.synced,
      errors: result.errors,
      message: `Cron sync completed: ${result.synced} users synced${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`
    }

    console.log('✅ Cron job completed:', response.message)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Cron job failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Cron sync failed'
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req)
}
