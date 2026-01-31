import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/states/[id] - Get a specific state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.getStateById(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'State not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      state: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in GET /api/locations/states/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/states/[id] - Update a specific state
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    const result = await LocationService.updateState(resolvedParams.id, country_id.trim(), name.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      state: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in PUT /api/locations/states/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/states/[id] - Delete a specific state
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.deleteState(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'State deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/locations/states/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
