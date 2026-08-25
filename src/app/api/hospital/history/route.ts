import { NextRequest, NextResponse } from 'next/server'
import { requireHospital } from '@/lib/auth/requireHospital'
import { buildHistoryQuery } from './query'

/** GET /api/hospital/history — filterable admission history (US-009). */
export async function GET(request: NextRequest) {
  const ctx = await requireHospital()
  if ('error' in ctx) return ctx.error

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500)
  const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10) || 0

  const { data, error, count } = await buildHistoryQuery(ctx, searchParams)
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data ?? [], count: count ?? 0 })
}
