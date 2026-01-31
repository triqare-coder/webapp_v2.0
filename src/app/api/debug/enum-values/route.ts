import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/debug/enum-values - Check the actual enum values in the database
export async function GET(request: NextRequest) {
  try {
    // Query to get enum values for sos_status
    const { data, error } = await supabase
      .rpc('get_enum_values', { enum_name: 'sos_status' })

    if (error) {
      console.error('Error getting enum values:', error)
      
      // Alternative approach - try to get from information_schema
      const { data: enumData, error: enumError } = await supabase
        .from('information_schema.enum_range')
        .select('*')
      
      if (enumError) {
        console.error('Error getting enum from information_schema:', enumError)
        
        // Try direct SQL query
        const { data: sqlData, error: sqlError } = await supabase
          .rpc('sql', { 
            query: "SELECT unnest(enum_range(NULL::sos_status)) as enum_value;" 
          })
        
        return NextResponse.json({
          success: false,
          error: 'Could not retrieve enum values',
          attempts: {
            rpc_error: error.message,
            schema_error: enumError.message,
            sql_error: sqlError?.message
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        enum_values: enumData,
        method: 'information_schema'
      })
    }

    return NextResponse.json({
      success: true,
      enum_values: data,
      method: 'rpc'
    })

  } catch (error) {
    console.error('Error in GET /api/debug/enum-values:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
