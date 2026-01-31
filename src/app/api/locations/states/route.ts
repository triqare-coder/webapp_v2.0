import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/states - Get states by country ID or all states
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countryId = searchParams.get('country_id')

    let result
    if (countryId) {
      result = await LocationService.getStatesByCountry(countryId)
    } else {
      result = await LocationService.getAllStates()
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      states: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/locations/states:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/locations/states - Create a new state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { country_id, name } = body

    if (!country_id || typeof country_id !== 'string' || !country_id.trim()) {
      return NextResponse.json(
        { error: 'Country ID is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'State name is required' },
        { status: 400 }
      )
    }

    const result = await LocationService.createState(country_id.trim(), name.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      state: result.data,
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations/states:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
