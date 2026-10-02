import { NextRequest, NextResponse } from 'next/server'
import { requirePatient } from '@/lib/auth/requirePatient'
import { createServerClient } from '@/lib/supabase/server'
import { getRazorpayConfig } from '@/lib/payments/razorpay'
import { getProStatus } from '@/lib/payments/proSubscription'

export const dynamic = 'force-dynamic'

// GET /api/pro/plans — what the patient's Pro page needs in one call: the
// purchasable plans, whether checkout is configured (and in which mode), and
// the caller's current Pro status.
export async function GET(request: NextRequest) {
  const gate = await requirePatient(request)
  if (gate.error) return gate.error

  const db = createServerClient()
  const { data: plans, error } = await db
    .from('subscription_plans')
    .select('id, name, description, price, duration_days')
    .eq('is_active', true)
    .gt('price', 0)
    .order('duration_days', { ascending: true })
  if (error) {
    console.error('[pro/plans]', error.message)
    return NextResponse.json({ error: 'Could not load plans' }, { status: 500 })
  }

  const cfg = getRazorpayConfig()
  const status = await getProStatus(db, gate.appUser.id)
  return NextResponse.json({
    plans: plans ?? [],
    checkout: cfg ? { enabled: true, mode: cfg.mode } : { enabled: false, mode: null },
    status,
  })
}
