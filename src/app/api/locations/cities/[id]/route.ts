import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/cities/[id] - Get a specific city
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.getCityById(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      city: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in GET /api/locations/cities/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/cities/[id] - Update a specific city
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    const result = await LocationService.updateCity(resolvedParams.id, state_id.trim(), name.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      city: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in PUT /api/locations/cities/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/cities/[id] - Delete a specific city
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.deleteCity(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'City deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/locations/cities/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
