import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up RLS policies for users table...')

    const results = []

    // Step 1: Enable RLS on users table
    try {
      const { error: enableRLSError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;'
      })
      
      if (enableRLSError) {
        results.push({
          action: 'Enable RLS on users table',
          success: false,
          error: enableRLSError.message
        })
      } else {
        results.push({
          action: 'Enable RLS on users table',
          success: true,
          message: 'RLS enabled successfully'
        })
      }
    } catch (err) {
      results.push({
        action: 'Enable RLS on users table',
        success: false,
        error: 'Cannot execute SQL directly through Supabase client'
      })
    }

    // Step 2: Create RLS policies for users table
    const policies = [
      // Policy: Users can view their own profile
      {
        name: 'Users can view own profile',
        sql: `
        CREATE POLICY "Users can view own profile" ON public.users
        FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');
        `
      },
      // Policy: Users can update their own profile
      {
        name: 'Users can update own profile',
        sql: `
        CREATE POLICY "Users can update own profile" ON public.users
        FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');
        `
      },
      // Policy: Admins can view all users
      {
        name: 'Admins can view all users',
        sql: `
        CREATE POLICY "Admins can view all users" ON public.users
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
          )
        );
        `
      },
      // Policy: Admins can insert new users
      {
        name: 'Admins can insert users',
        sql: `
        CREATE POLICY "Admins can insert users" ON public.users
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
          )
        );
        `
      },
      // Policy: Admins can update all users
      {
        name: 'Admins can update all users',
        sql: `
        CREATE POLICY "Admins can update all users" ON public.users
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
          )
        );
        `
      },
      // Policy: Admins can delete users
      {
        name: 'Admins can delete users',
        sql: `
        CREATE POLICY "Admins can delete users" ON public.users
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub' 
            AND role = 'admin'
          )
        );
        `
      }
    ]

    // Create each policy
    for (const policy of policies) {
      try {
        const { error: policyError } = await supabase.rpc('exec_sql', {
          sql: policy.sql
        })
        
        if (policyError) {
          results.push({
            action: `Create policy: ${policy.name}`,
            success: false,
            error: policyError.message
          })
        } else {
          results.push({
            action: `Create policy: ${policy.name}`,
            success: true,
            message: 'Policy created successfully'
          })
        }
      } catch (err) {
        results.push({
          action: `Create policy: ${policy.name}`,
          success: false,
          error: 'Cannot execute SQL directly through Supabase client'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Users table RLS setup completed',
      results: results,
      instructions: {
        manual_setup: 'If automatic setup failed, run these SQL commands in Supabase SQL Editor:',
        sql_commands: [
          'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;',
          ...policies.map(p => p.sql.trim())
        ]
      }
    })

  } catch (error) {
    console.error('Users table RLS setup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Users table RLS setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
