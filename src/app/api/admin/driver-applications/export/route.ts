import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { listApplications, type DriverApplicationStatus } from '@/services/driverApplicationService'
import { driverApplicationExportColumns } from '@/lib/export/driverApplicationColumns'

const STATUSES: DriverApplicationStatus[] = ['pending', 'approved', 'rejected']

function escapeCsv(value: string): string {
  let v = value
  // Neutralize CSV/Excel formula injection: a leading =, +, -, @, tab or CR
  // can be executed as a formula by spreadsheet apps. Prefix with a quote.
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

// GET /api/admin/driver-applications/export?status=pending  (ADMIN)
//
// Exports driver applications using the isolated column mapping in
// src/lib/export/driverApplicationColumns.ts.
//
// NOTE: emitted as CSV for now (reuses the repo's CSV approach, no new deps).
// QP2-21: once TriQare's .xlsx template arrives, swap this serializer for an
// xlsx writer (e.g. `exceljs`) driven by the SAME column config — only the
// serialization below changes.
export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const statusParam = request.nextUrl.searchParams.get('status')
    const status = STATUSES.includes(statusParam as DriverApplicationStatus)
      ? (statusParam as DriverApplicationStatus)
      : undefined

    const rows = await listApplications(status)
    const columns = driverApplicationExportColumns

    const header = columns.map((c) => escapeCsv(c.header)).join(',')
    const body = rows
      .map((row) => columns.map((c) => escapeCsv(c.value(row))).join(','))
      .join('\r\n')
    const csv = `${header}\r\n${body}`

    const fileName = `driver-applications${status ? `-${status}` : ''}.csv`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error('[admin:applications:export] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Failed to export applications' }, { status: 500 })
  }
}
