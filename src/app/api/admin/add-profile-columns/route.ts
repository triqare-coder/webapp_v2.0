import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Adding missing profile columns to users table...')

    // SQL script to add all missing columns
    const addColumnsSQL = `
      -- Personal Information
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth date;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS zip_code text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country text;

      -- Emergency Contact Information
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact_name text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

      -- Medical Information (for patients)
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS medical_conditions text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allergies text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS medications text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blood_type text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS insurance_provider text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS insurance_number text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_checkup date;

      -- Professional Information (for staff)
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS years_experience text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS special_certifications text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS languages_spoken text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_shift text;

      -- Driver Information
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS license_number text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS license_class text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS license_expiry date;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS medical_cert_expiry date;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vehicle_assigned text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating numeric(3,2);
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_trips integer;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_trip timestamp with time zone;

      -- Transport Company Information
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS transport_company_id uuid;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS registration_number text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS operating_hours text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS service_area text;

      -- System/Preferences
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language_preference text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone text;
    `

    // Execute each ALTER TABLE statement individually
    const statements = addColumnsSQL.split(';').filter(stmt => stmt.trim())
    const results = []

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec', { sql: statement.trim() + ';' })
          if (error) {
            console.log('Statement error (may be expected if column exists):', error.message)
            results.push({ statement: statement.trim(), error: error.message })
          } else {
            results.push({ statement: statement.trim(), success: true })
          }
        } catch (err) {
          console.log('Statement exception:', err)
          results.push({ statement: statement.trim(), error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile columns addition attempted',
      results: results,
      totalStatements: statements.length
    })

  } catch (error) {
    console.error('Error in add-profile-columns:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add profile columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
