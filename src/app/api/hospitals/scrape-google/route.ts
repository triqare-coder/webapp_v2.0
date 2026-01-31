import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

// Google Places API endpoint
const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place'

interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  formatted_phone_number?: string
  website?: string
  opening_hours?: {
    weekday_text?: string[]
  }
  types: string[]
  rating?: number
  user_ratings_total?: number
}

interface PlaceDetails {
  result: GooglePlaceResult
}

export async function POST(request: NextRequest) {
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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { location = 'Kerala, India', radius = 50000, maxResults = 60 } = body

    const supabase = await createClient()

    // Get Kerala state and cities for location mapping
    const { data: keralaState } = await supabase
      .from('states')
      .select('id, name, country_id')
      .ilike('name', 'Kerala')
      .single()

    if (!keralaState) {
      return NextResponse.json({ error: 'Kerala state not found in database' }, { status: 404 })
    }

    const { data: keralaCities } = await supabase
      .from('cities')
      .select('id, name, state_id')
      .eq('state_id', keralaState.id)

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Search for hospitals in Kerala
    const searchUrl = `${GOOGLE_PLACES_API_URL}/textsearch/json?query=hospitals+in+${encodeURIComponent(location)}&key=${apiKey}`
    
    let allPlaces: GooglePlaceResult[] = []
    let nextPageToken: string | undefined = undefined
    let pageCount = 0
    const maxPages = Math.ceil(maxResults / 20) // Google returns max 20 results per page

    // Fetch multiple pages of results
    do {
      const url: string = nextPageToken
        ? `${searchUrl}&pagetoken=${nextPageToken}`
        : searchUrl

      const response = await fetch(url)
      const data = await response.json()

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        results.errors.push(`Google API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
        break
      }

      if (data.results && data.results.length > 0) {
        allPlaces = allPlaces.concat(data.results)
      }

      nextPageToken = data.next_page_token
      pageCount++

      // Wait 2 seconds before next page (Google requirement)
      if (nextPageToken && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } while (nextPageToken && pageCount < maxPages && allPlaces.length < maxResults)

    // Limit to maxResults
    allPlaces = allPlaces.slice(0, maxResults)

    console.log(`Found ${allPlaces.length} hospitals from Google Places API`)

    // Process each hospital
    for (const place of allPlaces) {
      try {
        // Check if hospital already exists by name
        const { data: existingHospital } = await supabase
          .from('hospitals')
          .select('id')
          .ilike('name', place.name)
          .single()

        if (existingHospital) {
          results.skipped++
          continue
        }

        // Get detailed information
        const detailsUrl = `${GOOGLE_PLACES_API_URL}/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,geometry&key=${apiKey}`
        const detailsResponse = await fetch(detailsUrl)
        const detailsData: PlaceDetails = await detailsResponse.json()
        const details = detailsData.result || place

        // Extract city from address
        let cityId = null
        if (keralaCities && details.formatted_address) {
          const city = keralaCities.find(c => 
            details.formatted_address.toLowerCase().includes(c.name.toLowerCase())
          )
          if (city) cityId = city.id
        }

        // Prepare hospital data
        const hospitalData = {
          name: details.name,
          hospital_type: 'private' as const, // Default to private, can be updated manually
          address_line: details.formatted_address || '',
          phone: details.formatted_phone_number || 'Not available',
          email: null,
          website: details.website || null,
          emergency_contact_person: 'Reception', // Default value
          emergency_contact_phone: details.formatted_phone_number || 'Not available',
          emergency_contact_email: null,
          country_id: keralaState.country_id || null,
          state_id: keralaState.id,
          city_id: cityId,
          pincode_id: null,
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          general_operating_hours: details.opening_hours?.weekday_text?.join(', ') || null,
          emergency_department_hours: '24/7', // Assume 24/7 for hospitals
          additional_notes: `Imported from Google Places. Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0}`,
          status: 'active' as const
        }

        const { error } = await supabase.from('hospitals').insert(hospitalData)

        if (error) {
          results.errors.push(`Failed to insert ${place.name}: ${error.message}`)
          results.failed++
        } else {
          results.success++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (err) {
        results.errors.push(`Error processing ${place.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        results.failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scraped ${allPlaces.length} hospitals from Google. Imported ${results.success}, Skipped ${results.skipped}, Failed ${results.failed}`,
      results
    })

  } catch (error: any) {
    console.error('Error scraping hospitals:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to scrape hospitals' 
    }, { status: 500 })
  }
}

