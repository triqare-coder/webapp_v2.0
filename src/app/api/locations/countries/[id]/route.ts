import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/countries/[id] - Get a specific country
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.getCountryById(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      country: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in GET /api/locations/countries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/countries/[id] - Update a specific country
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Country name is required' },
        { status: 400 }
      )
    }

    const result = await LocationService.updateCountry(resolvedParams.id, name.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      country: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in PUT /api/locations/countries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/countries/[id] - Delete a specific country
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.deleteCountry(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Country deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/locations/countries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
