import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/countries - Get all countries
export async function GET(request: NextRequest) {
  try {
    const result = await LocationService.getCountries()

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      countries: result.data
    })
  } catch (error) {
    console.error('Error in GET /api/locations/countries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/locations/countries - Create a new country
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Country name is required' },
        { status: 400 }
      )
    }

    const result = await LocationService.createCountry(name.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      country: result.data,
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/locations/countries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
