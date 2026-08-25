import { NextRequest, NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'

/**
 * POST /api/hospital/notifications/read   { id }  or  { all: true }
 *
 * Marking read is a write, so it goes through the service-role client after
 * requireHospital() -- the client grant on hospital_notifications is SELECT only.
 * The update is scoped to the caller's hospital_id as well as the row id, so a
 * guessed id from another hospital updates nothing.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx

  let body: { id?: string; all?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  let query = supabase
    .from('hospital_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('hospital_id', hospitalId)
    .is('read_at', null)

  if (!body.all) {
    if (!body.id) return NextResponse.json({ error: 'Provide an id, or all: true' }, { status: 400 })
    query = query.eq('id', body.id)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
