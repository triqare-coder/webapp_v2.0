import { NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'

/** GET /api/hospital/me — the signed-in admin's hospital identity (US-002). */
export async function GET() {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error

  return NextResponse.json({
    hospitalId: ctx.hospitalId,
    hospitalName: ctx.hospitalName,
    adminEmail: ctx.adminEmail,
  })
}
