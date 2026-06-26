import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// SECURITY: structural-repair tooling that alters live FK constraints. Admin-only.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    console.log('🔧 Fixing foreign key constraints to reference users table...')

    const results = []

    // Step 1: Fix SOS requests foreign keys
    const sosConstraints = [
      {
        name: 'Drop old patient_id constraint',
        sql: 'ALTER TABLE public.sos_requests DROP CONSTRAINT IF EXISTS sos_requests_patient_id_fkey;'
      },
      {
        name: 'Drop old driver_id constraint',
        sql: 'ALTER TABLE public.sos_requests DROP CONSTRAINT IF EXISTS sos_requests_driver_id_fkey;'
      },
      {
        name: 'Add new patient_id constraint',
        sql: 'ALTER TABLE public.sos_requests ADD CONSTRAINT sos_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id);'
      },
      {
        name: 'Add new driver_id constraint',
        sql: 'ALTER TABLE public.sos_requests ADD CONSTRAINT sos_requests_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);'
      }
    ]

    // Execute each constraint fix
    for (const constraint of sosConstraints) {
      try {
        const { error: constraintError } = await supabase.rpc('exec_sql', {
          sql: constraint.sql
        })
        
        if (constraintError) {
          results.push({
            action: constraint.name,
            success: false,
            error: constraintError.message
          })
        } else {
          results.push({
            action: constraint.name,
            success: true,
            message: 'Constraint updated successfully'
          })
        }
      } catch (err) {
        results.push({
          action: constraint.name,
          success: false,
          error: 'Cannot execute SQL directly through Supabase client'
        })
      }
    }

    // Step 2: Check for other tables that might reference user_records
    const otherTables = [
      'transport_requests',
      'notifications',
      'user_sessions',
      'audit_logs'
    ]

    for (const tableName of otherTables) {
      try {
        // Check if table exists and has foreign keys to user_records
        const { data: tableInfo, error: tableError } = await supabase
          .from('information_schema.table_constraints')
          .select('constraint_name, table_name')
          .eq('table_name', tableName)
          .eq('constraint_type', 'FOREIGN KEY')

        if (!tableError && tableInfo && tableInfo.length > 0) {
          results.push({
            action: `Check table: ${tableName}`,
            success: true,
            message: `Found ${tableInfo.length} foreign key constraints - may need manual review`
          })
        }
      } catch (err) {
        // Table might not exist, which is fine
        results.push({
          action: `Check table: ${tableName}`,
          success: true,
          message: 'Table does not exist or no foreign keys found'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Foreign key constraints fix completed',
      results: results,
      instructions: {
        manual_fix: 'If automatic fix failed, run these SQL commands in Supabase SQL Editor:',
        sql_commands: sosConstraints.map(c => c.sql)
      }
    })

  } catch (error) {
    console.error('Foreign key fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'Foreign key fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
