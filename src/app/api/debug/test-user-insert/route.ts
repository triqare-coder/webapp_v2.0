import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing user insert...')

    // Test inserting a simple user record
    const testUser = {
      clerk_user_id: 'test_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      full_name: 'Test User',
      role: 'patient',
      is_active: true
    }

    console.log('Attempting to insert:', testUser)

    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert test user',
        details: error.message,
        testUser
      }, { status: 500 })
    }

    console.log('Insert successful:', data)

    // Clean up - delete the test user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', data.id)

    if (deleteError) {
      console.error('Cleanup error:', deleteError)
    }

    return NextResponse.json({
      success: true,
      message: 'Test user insert successful',
      insertedUser: data,
      cleanedUp: !deleteError
    })

  } catch (error) {
    console.error('Test insert error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test user insert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
