import { NextRequest, NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'

/** GET /api/hospital/notifications — the notification centre feed (6.11). */
export async function GET(request: NextRequest) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx

  const limit = Math.min(
    Number.parseInt(new URL(request.url).searchParams.get('limit') ?? '30', 10) || 30,
    100,
  )

  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('hospital_notifications')
      .select('id, type, message, sos_request_id, patient_id, read_at, created_at')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('hospital_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .is('read_at', null),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data ?? [], unread: count ?? 0 })
}
