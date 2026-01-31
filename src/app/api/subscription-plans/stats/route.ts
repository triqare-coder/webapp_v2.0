import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionPlanService } from '@/services/subscriptionPlanService'

// GET /api/subscription-plans/stats - Get subscription plan statistics
export async function GET(request: NextRequest) {
  try {
    const result = await SubscriptionPlanService.getSubscriptionPlanStats()
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Error in GET /api/subscription-plans/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
