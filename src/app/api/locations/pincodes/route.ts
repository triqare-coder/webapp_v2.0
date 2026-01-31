import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/pincodes - Get pincodes by city ID or all pincodes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('city_id')

    let result
    if (cityId) {
      result = await LocationService.getPincodesByCity(cityId)
    } else {
      result = await LocationService.getAllPincodes()
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pincodes: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/locations/pincodes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/locations/pincodes - Create a new pincode
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { city_id, code } = body

    if (!city_id || typeof city_id !== 'string' || !city_id.trim()) {
      return NextResponse.json(
        { error: 'City ID is required' },
        { status: 400 }
      )
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'Pincode is required' },
        { status: 400 }
      )
    }

    const result = await LocationService.createPincode(city_id.trim(), code.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pincode: result.data,
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations/pincodes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
