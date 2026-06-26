import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// SECURITY: schema-bootstrap tooling that creates a live table. Admin-only.
export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    console.log('Creating pending_csv_imports table...')

    // Create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- pending_csv_imports table
        -- Stores data from CSV imports until users accept their invitations

        CREATE TABLE IF NOT EXISTS public.pending_csv_imports (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            invitation_id VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'ert', 'transport_company', 'patient', 'driver')),
            import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('driver', 'patient', 'transport_company')),
            data JSONB NOT NULL,
            imported_by VARCHAR(255) NOT NULL,
            processed BOOLEAN DEFAULT false,
            processed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_invitation_id ON public.pending_csv_imports(invitation_id);
        CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_email ON public.pending_csv_imports(email);
        CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_processed ON public.pending_csv_imports(processed);
        CREATE INDEX IF NOT EXISTS idx_pending_csv_imports_role ON public.pending_csv_imports(role);
      `
    })

    if (createError) {
      console.error('Error creating table:', createError)
      return NextResponse.json({ 
        error: 'Failed to create table',
        details: createError 
      }, { status: 500 })
    }

    console.log('Table created successfully')

    return NextResponse.json({ 
      success: true,
      message: 'pending_csv_imports table created successfully'
    })
  } catch (error) {
    console.error('Error in setup:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

