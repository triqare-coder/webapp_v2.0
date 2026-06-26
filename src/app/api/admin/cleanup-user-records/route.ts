import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// SECURITY: destructive cleanup tooling that drops/deletes live user_records
// artifacts. Admin-only.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    console.log('🧹 Cleaning up user_records table and related artifacts...')

    const results = []

    // Step 1: Check if user_records table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('user_records')
      .select('id')
      .limit(1)

    if (checkError && checkError.message?.includes('relation "user_records" does not exist')) {
      results.push({
        action: 'Check user_records table',
        success: true,
        message: 'user_records table does not exist - already cleaned up'
      })
    } else if (checkError) {
      results.push({
        action: 'Check user_records table',
        success: false,
        error: checkError.message
      })
    } else {
      // Table exists, proceed with cleanup
      results.push({
        action: 'Check user_records table',
        success: true,
        message: 'user_records table exists - proceeding with cleanup'
      })

      // Step 2: Drop RLS policies on user_records
      const policies = [
        'Users can view own profile',
        'Users can update own profile',
        'Admins can view all users',
        'Admins can insert users',
        'Admins can update all users',
        'Admins can delete users'
      ]

      for (const policyName of policies) {
        try {
          const { error: dropPolicyError } = await supabase.rpc('exec_sql', {
            sql: `DROP POLICY IF EXISTS "${policyName}" ON public.user_records;`
          })
          
          if (dropPolicyError) {
            results.push({
              action: `Drop policy: ${policyName}`,
              success: false,
              error: dropPolicyError.message
            })
          } else {
            results.push({
              action: `Drop policy: ${policyName}`,
              success: true,
              message: 'Policy dropped successfully'
            })
          }
        } catch (err) {
          results.push({
            action: `Drop policy: ${policyName}`,
            success: false,
            error: 'Cannot execute SQL directly through Supabase client'
          })
        }
      }

      // Step 3: Drop the trigger and function
      try {
        const { error: dropTriggerError } = await supabase.rpc('exec_sql', {
          sql: 'DROP TRIGGER IF EXISTS update_user_records_updated_at ON public.user_records;'
        })
        
        if (dropTriggerError) {
          results.push({
            action: 'Drop trigger',
            success: false,
            error: dropTriggerError.message
          })
        } else {
          results.push({
            action: 'Drop trigger',
            success: true,
            message: 'Trigger dropped successfully'
          })
        }
      } catch (err) {
        results.push({
          action: 'Drop trigger',
          success: false,
          error: 'Cannot execute SQL directly through Supabase client'
        })
      }

      try {
        const { error: dropFunctionError } = await supabase.rpc('exec_sql', {
          sql: 'DROP FUNCTION IF EXISTS update_user_records_updated_at_column();'
        })
        
        if (dropFunctionError) {
          results.push({
            action: 'Drop function',
            success: false,
            error: dropFunctionError.message
          })
        } else {
          results.push({
            action: 'Drop function',
            success: true,
            message: 'Function dropped successfully'
          })
        }
      } catch (err) {
        results.push({
          action: 'Drop function',
          success: false,
          error: 'Cannot execute SQL directly through Supabase client'
        })
      }

      // Step 4: Drop the table
      try {
        const { error: dropTableError } = await supabase.rpc('exec_sql', {
          sql: 'DROP TABLE IF EXISTS public.user_records CASCADE;'
        })
        
        if (dropTableError) {
          results.push({
            action: 'Drop user_records table',
            success: false,
            error: dropTableError.message
          })
        } else {
          results.push({
            action: 'Drop user_records table',
            success: true,
            message: 'Table dropped successfully'
          })
        }
      } catch (err) {
        results.push({
          action: 'Drop user_records table',
          success: false,
          error: 'Cannot execute SQL directly through Supabase client'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'user_records cleanup completed',
      results: results,
      instructions: {
        manual_cleanup: 'If automatic cleanup failed, run these SQL commands in Supabase SQL Editor:',
        sql_commands: [
          'DROP TABLE IF EXISTS public.user_records CASCADE;',
          'DROP FUNCTION IF EXISTS update_user_records_updated_at_column();'
        ]
      }
    })

  } catch (error) {
    console.error('user_records cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'user_records cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
