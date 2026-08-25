import { NextRequest, NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'
import { drivingEtaMinutes } from '@/lib/hospital/eta'

/**
 * GET /api/hospital/alerts/[alertId]/eta — live ETA for an incoming ambulance
 * (US-008).
 *
 * The ETA is computed HERE rather than reported by the driver app. The mobile
 * app does compute a route, but it never persists the duration, so the number
 * exists only on the driver's phone. What IS in the database is the driver's
 * live position (drivers.current_latitude/longitude, updated for tracking), and
 * that plus the destination is enough to recompute the ETA server-side -- no
 * mobile release required.
 *
 * Recomputing from live GPS on every call is also what satisfies "updates
 * within 60s of a significant route change": there is no cached route to go
 * stale, so a detour shows up on the next poll by construction.
 *
 * Scenario C is excluded on purpose: an off-platform destination gets no ETA.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error
  const { supabase, hospitalId } = ctx
  const { alertId } = await params

  // Scoped to hospital_id: another hospital's alert id resolves to nothing.
  const { data: alert } = await supabase
    .from('hospital_sos_alerts')
    .select('id, sos_request_id, status, destination_kind, destination_hospital_id, hospital_id, eta_at_confirmation_minutes')
    .eq('id', alertId)
    .eq('hospital_id', hospitalId)
    .maybeSingle()

  if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  if (alert.status !== 'CONFIRMED_INCOMING') {
    return NextResponse.json({ etaMinutes: null, reason: 'not_incoming' })
  }

  const { data: sos } = await supabase
    .from('sos_requests')
    .select('driver_id')
    .eq('id', alert.sos_request_id)
    .maybeSingle()
  if (!sos?.driver_id) return NextResponse.json({ etaMinutes: null, reason: 'no_driver' })

  const { data: driver } = await supabase
    .from('drivers')
    .select('current_latitude, current_longitude, last_location_update')
    .eq('user_id', sos.driver_id)
    .maybeSingle()
  if (driver?.current_latitude == null || driver?.current_longitude == null) {
    return NextResponse.json({ etaMinutes: null, reason: 'no_driver_location' })
  }

  const { data: destination } = await supabase
    .from('hospitals')
    .select('latitude, longitude')
    .eq('id', alert.destination_hospital_id ?? alert.hospital_id)
    .maybeSingle()
  if (destination?.latitude == null || destination?.longitude == null) {
    return NextResponse.json({ etaMinutes: null, reason: 'no_destination_location' })
  }

  const eta = await drivingEtaMinutes(
    { lat: Number(driver.current_latitude), lng: Number(driver.current_longitude) },
    { lat: Number(destination.latitude), lng: Number(destination.longitude) },
  )
  if (eta == null) return NextResponse.json({ etaMinutes: null, reason: 'route_unavailable' })

  const nowIso = new Date().toISOString()
  // The at-confirmation figure is written once and then left alone: US-009
  // records the ETA quoted when the hospital was told to expect the patient,
  // not the most recent estimate.
  const update: Record<string, unknown> = { eta_minutes: eta, eta_updated_at: nowIso }
  if (alert.eta_at_confirmation_minutes == null) update.eta_at_confirmation_minutes = eta

  await supabase.from('hospital_sos_alerts').update(update).eq('id', alert.id)

  return NextResponse.json({
    etaMinutes: eta,
    etaUpdatedAt: nowIso,
    driverLocationAt: driver.last_location_update ?? null,
  })
}
