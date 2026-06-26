import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// SECURITY: structural-repair tooling that drops/recreates constraints on the
// live users table. Admin-only.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    console.log('Fixing users table constraints...')

    // Drop the problematic foreign key constraint
    const { error: dropConstraintError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;'
    })

    if (dropConstraintError) {
      console.log('Note: Could not drop constraint (may not exist):', dropConstraintError.message)
    }

    // Fix the is_active column to be boolean instead of text
    const { error: fixBooleanError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.users ALTER COLUMN is_active TYPE boolean USING 
        CASE 
          WHEN is_active = 'true' THEN true
          WHEN is_active = 'false' THEN false
          ELSE true
        END;`
    })

    if (fixBooleanError) {
      console.log('Note: Could not fix boolean column (may already be correct):', fixBooleanError.message)
    }

    // Set default value for is_active
    const { error: defaultError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.users ALTER COLUMN is_active SET DEFAULT true;'
    })

    if (defaultError) {
      console.log('Note: Could not set default for is_active:', defaultError.message)
    }

    // Add default UUID generation for id column
    const { error: uuidError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();'
    })

    if (uuidError) {
      console.log('Note: Could not set UUID default:', uuidError.message)
    }

    // Test the table by trying to insert a test record
    const testUser = {
      clerk_user_id: 'test_fix_' + Date.now(),
      email: 'test_fix_' + Date.now() + '@example.com',
      full_name: 'Test User',
      role: 'patient'
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select()

    if (insertError) {
      console.error('Test insert failed:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Table fix failed - test insert error',
        details: insertError.message
      }, { status: 500 })
    }

    // Clean up test record
    if (insertTest && insertTest[0]) {
      await supabase
        .from('users')
        .delete()
        .eq('id', insertTest[0].id)
    }

    console.log('Users table constraints fixed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Users table constraints fixed successfully. Foreign key constraint removed and data types corrected.',
      testInsert: 'Success - table is ready for Clerk user sync'
    })

  } catch (error) {
    console.error('Fix users table error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fix users table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
