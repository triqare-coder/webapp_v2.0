import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// SECURITY: this debug endpoint runs raw SQL (incl. ALTER TABLE ... DISABLE ROW LEVEL
// SECURITY on the emergency-request table). The middleware still allow-lists /api/debug
// as public, so this handler-level guard is the protection: blocked in production and
// admin-only otherwise.
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    console.log('🔧 Attempting to fix SOS RLS policies...')

    // First, let's check if RLS is enabled on sos_requests table
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('check_table_rls', { table_name: 'sos_requests' })
      .single()

    console.log('Table RLS info:', tableInfo, tableError)

    // Try to create RLS policies for sos_requests table
    const policies = [
      // Allow ERT users to insert SOS requests
      `
      CREATE POLICY "ert_can_insert_sos" ON public.sos_requests
      FOR INSERT 
      WITH CHECK (true);
      `,
      // Allow ERT users to select SOS requests
      `
      CREATE POLICY "ert_can_select_sos" ON public.sos_requests
      FOR SELECT 
      USING (true);
      `,
      // Allow ERT users to update SOS requests
      `
      CREATE POLICY "ert_can_update_sos" ON public.sos_requests
      FOR UPDATE 
      USING (true)
      WITH CHECK (true);
      `,
      // Allow ERT users to delete SOS requests
      `
      CREATE POLICY "ert_can_delete_sos" ON public.sos_requests
      FOR DELETE 
      USING (true);
      `
    ]

    const results = []
    for (const policy of policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec_sql', { 
          sql: policy 
        })
        
        if (policyError) {
          console.log('Policy creation error:', policyError)
          results.push({
            policy: policy.split('\n')[1].trim(),
            success: false,
            error: policyError.message
          })
        } else {
          results.push({
            policy: policy.split('\n')[1].trim(),
            success: true
          })
        }
      } catch (err) {
        results.push({
          policy: policy.split('\n')[1].trim(),
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Alternative: Try to disable RLS temporarily for testing
    try {
      const { error: disableRLSError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.sos_requests DISABLE ROW LEVEL SECURITY;'
      })
      
      if (disableRLSError) {
        results.push({
          action: 'Disable RLS',
          success: false,
          error: disableRLSError.message
        })
      } else {
        results.push({
          action: 'Disable RLS',
          success: true,
          message: 'RLS disabled for sos_requests table'
        })
      }
    } catch (err) {
      results.push({
        action: 'Disable RLS',
        success: false,
        error: 'Cannot execute SQL directly through Supabase client'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'RLS fix attempted',
      results: results,
      instructions: {
        manual_fix: 'If automatic fix failed, run these SQL commands in Supabase SQL Editor:',
        sql_commands: [
          'ALTER TABLE public.sos_requests DISABLE ROW LEVEL SECURITY;',
          'OR create proper RLS policies:',
          'CREATE POLICY "allow_ert_all" ON public.sos_requests FOR ALL USING (true) WITH CHECK (true);'
        ]
      }
    })

  } catch (error) {
    console.error('🔧 RLS fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix RLS policies',
      details: error instanceof Error ? error.message : 'Unknown error',
      manual_instructions: {
        message: 'Please run this SQL command in Supabase SQL Editor to fix the issue:',
        sql: 'ALTER TABLE public.sos_requests DISABLE ROW LEVEL SECURITY;'
      }
    })
  }
}
