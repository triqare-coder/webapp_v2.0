import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/debug/fix-sos-enum - Fix the SOS status enum by adding missing values
export async function POST(request: NextRequest) {
  try {
    // Execute the enum fix SQL
    const { data, error } = await supabase.rpc('sql', {
      query: `
        DO $$ 
        BEGIN
            -- Add 'Driver Assigned' if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Driver Assigned' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sos_status')) THEN
                ALTER TYPE sos_status ADD VALUE 'Driver Assigned';
            END IF;
            
            -- Add 'Driver En Route' if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Driver En Route' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sos_status')) THEN
                ALTER TYPE sos_status ADD VALUE 'Driver En Route';
            END IF;
            
            -- Add 'Patient Picked Up' if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Patient Picked Up' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sos_status')) THEN
                ALTER TYPE sos_status ADD VALUE 'Patient Picked Up';
            END IF;
            
            -- Add 'At Hospital' if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'At Hospital' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sos_status')) THEN
                ALTER TYPE sos_status ADD VALUE 'At Hospital';
            END IF;
            
            -- Add 'Completed' if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sos_status')) THEN
                ALTER TYPE sos_status ADD VALUE 'Completed';
            END IF;
            
            -- Add 'Cancelled' if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sos_status')) THEN
                ALTER TYPE sos_status ADD VALUE 'Cancelled';
            END IF;
        END $$;
      `
    })

    if (error) {
      console.error('Error fixing enum:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Now create the update function
    const { data: funcData, error: funcError } = await supabase.rpc('sql', {
      query: `
        CREATE OR REPLACE FUNCTION update_sos_request_status(
            request_id UUID,
            new_status TEXT,
            assigned_timestamp TIMESTAMPTZ DEFAULT NULL
        )
        RETURNS TABLE(
            id UUID,
            status TEXT,
            assigned_at TIMESTAMPTZ
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Update the SOS request with proper enum casting
            UPDATE sos_requests 
            SET 
                status = new_status::sos_status,
                assigned_at = COALESCE(assigned_timestamp, assigned_at)
            WHERE sos_requests.id = request_id;
            
            -- Return the updated record
            RETURN QUERY
            SELECT 
                sos_requests.id,
                sos_requests.status::TEXT,
                sos_requests.assigned_at
            FROM sos_requests 
            WHERE sos_requests.id = request_id;
        END;
        $$;
      `
    })

    if (funcError) {
      console.error('Error creating function:', funcError)
      return NextResponse.json(
        { success: false, error: funcError.message, enum_fixed: true },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SOS status enum fixed and update function created',
      enum_result: data,
      function_result: funcData
    })

  } catch (error) {
    console.error('Error in POST /api/debug/fix-sos-enum:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
