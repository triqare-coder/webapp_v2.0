import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/cities - Get cities by state ID or all cities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stateId = searchParams.get('state_id')

    let result
    if (stateId) {
      result = await LocationService.getCitiesByState(stateId)
    } else {
      result = await LocationService.getAllCities()
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      cities: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/locations/cities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/locations/cities - Create a new city
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { state_id, name } = body

    if (!state_id || typeof state_id !== 'string' || !state_id.trim()) {
      return NextResponse.json(
        { error: 'State ID is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'City name is required' },
        { status: 400 }
      )
    }

    const result = await LocationService.createCity(state_id.trim(), name.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      city: result.data,
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations/cities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
