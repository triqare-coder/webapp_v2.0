import { NextRequest, NextResponse } from 'next/server'
import { auditHospitalAccess, requireHospital } from '@/lib/auth/requireHospital'
import { buildHistoryQuery } from '../query'
import { toHistoryCsv, type AdmissionHistoryRow } from '@/lib/hospital/historyColumns'

/**
 * GET /api/hospital/history/export — CSV of the CURRENTLY FILTERED records
 * (US-009 AC5). Shares buildHistoryQuery with the table so the two cannot drift.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const { data, error } = await buildHistoryQuery(ctx, searchParams).limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bulk export of patient data is exactly what the audit log is for.
  await auditHospitalAccess(ctx, `EXPORT_ADMISSION_HISTORY (${data?.length ?? 0} records)`)

  const csv = toHistoryCsv((data ?? []) as AdmissionHistoryRow[])
  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="admission-history-${stamp}.csv"`,
    },
  })
}
