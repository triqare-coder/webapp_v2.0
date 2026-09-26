import { NextRequest, NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'
import { isLiveAlert, type AlertOutcome, type AlertStatus } from '@/lib/hospital/journey'

/**
 * GET /api/hospital/notifications — the notification centre feed (6.11).
 *
 * Each notification carries an `href`: where clicking it should land. An SOS
 * notice opens that emergency on the Patients tab while it is still live, and
 * in Admission History once it has closed, so a dismissed banner is always one
 * click away. Resolved here rather than in the client because "live" depends on
 * the alert's current state, not on what the notice said when it was written.
 */
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

  const sosIds = [...new Set((data ?? []).map((n) => n.sos_request_id).filter(Boolean))] as string[]
  const alerts = new Map<string, { id: string; status: AlertStatus; outcome: AlertOutcome }>()
  if (sosIds.length) {
    const { data: rows } = await supabase
      .from('hospital_sos_alerts')
      .select('id, sos_request_id, status, outcome')
      .eq('hospital_id', hospitalId)
      .in('sos_request_id', sosIds)
    for (const r of rows ?? []) alerts.set(r.sos_request_id as string, r as never)
  }

  const notifications = (data ?? []).map((n) => {
    let href: string | null = null
    const alert = n.sos_request_id ? alerts.get(n.sos_request_id) : undefined
    if (alert) {
      href = isLiveAlert(alert) ? `/hospital/patients?alert=${alert.id}` : `/hospital/history?alert=${alert.id}`
    } else if (n.type === 'REGISTRATION' && n.patient_id) {
      href = `/hospital/patients/${n.patient_id}`
    } else if (n.type === 'ACCOUNT_DELETED') {
      href = '/hospital?registered=INACTIVE'
    } else if (n.type === 'PREFERENCE_CHANGE') {
      href = '/hospital'
    }
    return { ...n, href }
  })

  return NextResponse.json({ notifications, unread: count ?? 0 })
}
