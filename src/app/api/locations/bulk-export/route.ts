import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const userRole = user.publicMetadata?.role
    
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Fetch all pincodes with their hierarchical data
    const { data: pincodes, error } = await supabase
      .from('pincodes')
      .select(`
        code,
        city:cities (
          name,
          state:states (
            name,
            country:countries (
              name
            )
          )
        )
      `)
      .order('code')

    if (error) {
      console.error('Error fetching pincodes:', error)
      return NextResponse.json({ error: 'Failed to fetch location data' }, { status: 500 })
    }

    if (!pincodes || pincodes.length === 0) {
      return NextResponse.json({ 
        success: true,
        data: [],
        message: 'No location data found'
      })
    }

    // Transform data to flat structure
    const exportData = pincodes.map((pincode: any) => ({
      country_name: pincode.city?.state?.country?.name || '',
      state_name: pincode.city?.state?.name || '',
      city_name: pincode.city?.name || '',
      pincode: pincode.code || ''
    }))

    return NextResponse.json({
      success: true,
      data: exportData
    })

  } catch (error: any) {
    console.error('Error in bulk export:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to export location data' 
    }, { status: 500 })
  }
}

