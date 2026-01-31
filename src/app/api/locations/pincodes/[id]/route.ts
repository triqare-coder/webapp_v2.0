import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// GET /api/locations/pincodes/[id] - Get a specific pincode
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.getPincodeById(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Pincode not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      pincode: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in GET /api/locations/pincodes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/pincodes/[id] - Update a specific pincode
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    const result = await LocationService.updatePincode(resolvedParams.id, city_id.trim(), code.trim())

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pincode: result.data,
      success: true
    })
  } catch (error) {
    console.error('Error in PUT /api/locations/pincodes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/pincodes/[id] - Delete a specific pincode
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const result = await LocationService.deletePincode(resolvedParams.id)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pincode deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/locations/pincodes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
