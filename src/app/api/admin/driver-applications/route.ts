import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { listApplications, type DriverApplicationStatus } from '@/services/driverApplicationService'

const STATUSES: DriverApplicationStatus[] = ['pending', 'approved', 'rejected']

// GET /api/admin/driver-applications?status=pending  (ADMIN)
// Returns masked rows (no decrypted PII) with reapplication history.
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const statusParam = request.nextUrl.searchParams.get('status')
    const status = STATUSES.includes(statusParam as DriverApplicationStatus)
      ? (statusParam as DriverApplicationStatus)
      : undefined

    // Fetch ALL (unfiltered) to compute reapplication history across statuses.
    const all = await listApplications()

    const byEmail = new Map<string, typeof all>()
    const byPhone = new Map<string, typeof all>()
    const pushTo = (map: Map<string, typeof all>, key: string, value: (typeof all)[number]) => {
      const arr = map.get(key)
      if (arr) arr.push(value)
      else map.set(key, [value])
    }
    for (const a of all) {
      pushTo(byEmail, a.email, a)
      pushTo(byPhone, a.phone, a)
    }

    const visible = status ? all.filter((a) => a.status === status) : all

    const items = visible.map((a) => {
      const related = new Map<string, (typeof all)[number]>()
      for (const r of [...(byEmail.get(a.email) ?? []), ...(byPhone.get(a.phone) ?? [])]) {
        if (r.id !== a.id && r.created_at < a.created_at) related.set(r.id, r)
      }
      const priors = [...related.values()]
        .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
        .map((p) => ({
          reference_number: p.reference_number,
          created_at: p.created_at,
          status: p.status,
          rejection_reason: p.rejection_reason,
          reviewed_at: p.reviewed_at,
        }))
      return {
        id: a.id,
        reference_number: a.reference_number,
        full_name: a.full_name,
        phone: a.phone,
        email: a.email,
        vehicle_type: a.vehicle_type,
        aadhaar_last4: a.aadhaar_last4,
        license_last4: a.license_last4,
        status: a.status,
        created_at: a.created_at,
        reviewed_at: a.reviewed_at,
        reapplication: priors.length > 0,
        priors,
      }
    })

    return NextResponse.json({ applications: items, success: true })
  } catch (err) {
    console.error('[admin:applications:list] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 })
  }
}
