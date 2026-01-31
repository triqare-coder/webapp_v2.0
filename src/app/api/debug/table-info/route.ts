import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/debug/table-info - Get information about the users table
export async function GET() {
  try {
    // Try to get table structure information
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'users' })

    if (tableError) {
      console.log('Table info error:', tableError)
    }

    // Try to get a sample of existing users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      console.log('Users query error:', usersError)
    }

    // Try to get table constraints
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_table_constraints', { table_name: 'users' })

    if (constraintsError) {
      console.log('Constraints error:', constraintsError)
    }

    return NextResponse.json({
      tableInfo: tableInfo || 'Not available',
      users: users || [],
      usersError: usersError?.message || null,
      constraints: constraints || 'Not available',
      constraintsError: constraintsError?.message || null
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
