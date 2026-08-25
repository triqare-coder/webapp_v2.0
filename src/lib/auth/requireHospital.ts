import { NextResponse } from 'next/server'
import { createClient, getAuthedUser } from '@/lib/supabase/server'

type Supabase = ReturnType<typeof createClient>

export interface HospitalContext {
  hospitalId: string
  hospitalName: string
  adminUserId: string
  adminEmail: string
  supabase: Supabase
  error?: undefined
}

/**
 * Resolves the signed-in Hospital Admin and the ONE hospital they belong to,
 * and hands back a service-role client for their queries. SERVER-ONLY.
 *
 * Mirrors getTransportCompany(), the existing tenant-scoping precedent.
 *
 * The returned hospitalId is the only tenant key any hospital route may use. No
 * route should ever take a hospital id from the request: doing so would make
 * cross-hospital access a matter of guessing a uuid. RLS on the hospital_* tables
 * is the second line of defence, not the first -- these routes hold the
 * service-role key, which bypasses it.
 */
export async function requireHospital(): Promise<HospitalContext | { error: NextResponse }> {
  const supabase = createClient()
  const { user, appUser } = await getAuthedUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!appUser) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }
  if (appUser.role !== 'hospital') {
    return {
      error: NextResponse.json({ error: 'Forbidden - hospital access required' }, { status: 403 }),
    }
  }

  const { data: link, error: linkError } = await supabase
    .from('hospital_admins')
    .select('hospital_id, email, hospitals(name)')
    .eq('user_id', appUser.id as string)
    .maybeSingle()

  if (linkError || !link) {
    return {
      error: NextResponse.json(
        { error: 'This account is not linked to a hospital. Contact support@triqare.com.' },
        { status: 404 },
      ),
    }
  }

  const hospital = link.hospitals as unknown as { name?: string } | null

  return {
    hospitalId: link.hospital_id as string,
    hospitalName: hospital?.name ?? 'Your Hospital',
    adminUserId: appUser.id as string,
    adminEmail: (link.email as string) ?? (appUser.email as string) ?? '',
    supabase,
  }
}

/**
 * DPDPA 2023 audit trail. Best-effort: a failed audit write must not deny a
 * clinician the patient record they are entitled to during an emergency, so it
 * logs and continues rather than throwing.
 */
export async function auditHospitalAccess(
  ctx: HospitalContext,
  action: string,
  target: { patientId?: string | null; sosRequestId?: string | null } = {},
): Promise<void> {
  const { error } = await ctx.supabase.from('hospital_audit_log').insert({
    hospital_admin_user_id: ctx.adminUserId,
    hospital_id: ctx.hospitalId,
    action,
    patient_id: target.patientId ?? null,
    sos_request_id: target.sosRequestId ?? null,
  })
  if (error) console.error('[hospital-audit] write failed:', error.message)
}
