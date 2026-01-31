import { NextRequest, NextResponse } from 'next/server'
import { LocationService } from '@/services/locationService'

// POST /api/locations/seed - Seed sample location data
export async function POST(request: NextRequest) {
  try {
    // Sample data to seed
    const sampleData = {
      countries: [
        { name: 'United States' },
        { name: 'India' },
        { name: 'United Kingdom' },
        { name: 'Canada' }
      ],
      states: [
        // US States
        { country: 'United States', name: 'New York' },
        { country: 'United States', name: 'California' },
        { country: 'United States', name: 'Texas' },
        { country: 'United States', name: 'Florida' },
        // Indian States
        { country: 'India', name: 'Maharashtra' },
        { country: 'India', name: 'Karnataka' },
        { country: 'India', name: 'Delhi' },
        { country: 'India', name: 'Tamil Nadu' },
        // UK States/Regions
        { country: 'United Kingdom', name: 'England' },
        { country: 'United Kingdom', name: 'Scotland' },
        { country: 'United Kingdom', name: 'Wales' },
        // Canadian Provinces
        { country: 'Canada', name: 'Ontario' },
        { country: 'Canada', name: 'British Columbia' },
        { country: 'Canada', name: 'Quebec' }
      ],
      cities: [
        // US Cities
        { state: 'New York', name: 'New York City' },
        { state: 'New York', name: 'Buffalo' },
        { state: 'California', name: 'Los Angeles' },
        { state: 'California', name: 'San Francisco' },
        { state: 'Texas', name: 'Houston' },
        { state: 'Texas', name: 'Dallas' },
        { state: 'Florida', name: 'Miami' },
        { state: 'Florida', name: 'Orlando' },
        // Indian Cities
        { state: 'Maharashtra', name: 'Mumbai' },
        { state: 'Maharashtra', name: 'Pune' },
        { state: 'Karnataka', name: 'Bangalore' },
        { state: 'Karnataka', name: 'Mysore' },
        { state: 'Delhi', name: 'New Delhi' },
        { state: 'Tamil Nadu', name: 'Chennai' },
        // UK Cities
        { state: 'England', name: 'London' },
        { state: 'England', name: 'Manchester' },
        { state: 'Scotland', name: 'Edinburgh' },
        { state: 'Wales', name: 'Cardiff' },
        // Canadian Cities
        { state: 'Ontario', name: 'Toronto' },
        { state: 'Ontario', name: 'Ottawa' },
        { state: 'British Columbia', name: 'Vancouver' },
        { state: 'Quebec', name: 'Montreal' }
      ],
      pincodes: [
        // US ZIP codes
        { city: 'New York City', code: '10001' },
        { city: 'New York City', code: '10002' },
        { city: 'Buffalo', code: '14201' },
        { city: 'Los Angeles', code: '90001' },
        { city: 'Los Angeles', code: '90002' },
        { city: 'San Francisco', code: '94101' },
        { city: 'Houston', code: '77001' },
        { city: 'Dallas', code: '75201' },
        { city: 'Miami', code: '33101' },
        { city: 'Orlando', code: '32801' },
        // Indian PIN codes
        { city: 'Mumbai', code: '400001' },
        { city: 'Mumbai', code: '400002' },
        { city: 'Pune', code: '411001' },
        { city: 'Bangalore', code: '560001' },
        { city: 'Mysore', code: '570001' },
        { city: 'New Delhi', code: '110001' },
        { city: 'Chennai', code: '600001' },
        // UK Postcodes
        { city: 'London', code: 'SW1A 1AA' },
        { city: 'London', code: 'W1A 0AX' },
        { city: 'Manchester', code: 'M1 1AA' },
        { city: 'Edinburgh', code: 'EH1 1YZ' },
        { city: 'Cardiff', code: 'CF10 1NS' },
        // Canadian Postal codes
        { city: 'Toronto', code: 'M5H 2N2' },
        { city: 'Ottawa', code: 'K1A 0A6' },
        { city: 'Vancouver', code: 'V6B 1A1' },
        { city: 'Montreal', code: 'H2Y 1C6' }
      ]
    }

    const results = {
      countries: [] as any[],
      states: [] as any[],
      cities: [] as any[],
      pincodes: [] as any[]
    }

    // Create countries
    for (const countryData of sampleData.countries) {
      const result = await LocationService.createCountry(countryData.name)
      if (result.data) {
        results.countries.push(result.data)
      }
    }

    // Create states
    for (const stateData of sampleData.states) {
      const country = results.countries.find(c => c.name === stateData.country)
      if (country) {
        const result = await LocationService.createState(country.id, stateData.name)
        if (result.data) {
          results.states.push(result.data)
        }
      }
    }

    // Create cities
    for (const cityData of sampleData.cities) {
      const state = results.states.find(s => s.name === cityData.state)
      if (state) {
        const result = await LocationService.createCity(state.id, cityData.name)
        if (result.data) {
          results.cities.push(result.data)
        }
      }
    }

    // Create pincodes
    for (const pincodeData of sampleData.pincodes) {
      const city = results.cities.find(c => c.name === pincodeData.city)
      if (city) {
        const result = await LocationService.createPincode(city.id, pincodeData.code)
        if (result.data) {
          results.pincodes.push(result.data)
        }
      }
    }

    return NextResponse.json({
      message: 'Sample location data seeded successfully',
      results: {
        countries: results.countries.length,
        states: results.states.length,
        cities: results.cities.length,
        pincodes: results.pincodes.length
      }
    })
  } catch (error) {
    console.error('Error seeding location data:', error)
    return NextResponse.json(
      { error: 'Failed to seed location data' },
      { status: 500 }
    )
  }
}
