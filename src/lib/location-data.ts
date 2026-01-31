// Mock location data for dropdowns

export interface Country {
  id: string
  name: string
  code: string
}

export interface State {
  id: string
  name: string
  code: string
  country_id: string
}

export interface City {
  id: string
  name: string
  state_id: string
}

export interface Pincode {
  id: string
  code: string
  city_id: string
}

export const mockCountries: Country[] = [
  { id: 'us-1', name: 'United States', code: 'US' },
  { id: 'in-1', name: 'India', code: 'IN' },
  { id: 'uk-1', name: 'United Kingdom', code: 'UK' },
  { id: 'ca-1', name: 'Canada', code: 'CA' },
  { id: 'au-1', name: 'Australia', code: 'AU' }
]

export const mockStates: State[] = [
  // US States
  { id: 'ny-1', name: 'New York', code: 'NY', country_id: 'us-1' },
  { id: 'ca-1', name: 'California', code: 'CA', country_id: 'us-1' },
  { id: 'tx-1', name: 'Texas', code: 'TX', country_id: 'us-1' },
  { id: 'fl-1', name: 'Florida', code: 'FL', country_id: 'us-1' },
  
  // Indian States
  { id: 'mh-1', name: 'Maharashtra', code: 'MH', country_id: 'in-1' },
  { id: 'dl-1', name: 'Delhi', code: 'DL', country_id: 'in-1' },
  { id: 'ka-1', name: 'Karnataka', code: 'KA', country_id: 'in-1' },
  { id: 'tn-1', name: 'Tamil Nadu', code: 'TN', country_id: 'in-1' },
  
  // UK States/Regions
  { id: 'eng-1', name: 'England', code: 'ENG', country_id: 'uk-1' },
  { id: 'sct-1', name: 'Scotland', code: 'SCT', country_id: 'uk-1' },
  { id: 'wal-1', name: 'Wales', code: 'WAL', country_id: 'uk-1' }
]

export const mockCities: City[] = [
  // New York Cities
  { id: 'nyc-1', name: 'New York City', state_id: 'ny-1' },
  { id: 'brooklyn-1', name: 'Brooklyn', state_id: 'ny-1' },
  { id: 'queens-1', name: 'Queens', state_id: 'ny-1' },
  { id: 'manhattan-1', name: 'Manhattan', state_id: 'ny-1' },
  { id: 'bronx-1', name: 'Bronx', state_id: 'ny-1' },
  
  // California Cities
  { id: 'la-1', name: 'Los Angeles', state_id: 'ca-1' },
  { id: 'sf-1', name: 'San Francisco', state_id: 'ca-1' },
  { id: 'sd-1', name: 'San Diego', state_id: 'ca-1' },
  
  // Texas Cities
  { id: 'houston-1', name: 'Houston', state_id: 'tx-1' },
  { id: 'dallas-1', name: 'Dallas', state_id: 'tx-1' },
  { id: 'austin-1', name: 'Austin', state_id: 'tx-1' },
  
  // Florida Cities
  { id: 'miami-1', name: 'Miami', state_id: 'fl-1' },
  { id: 'orlando-1', name: 'Orlando', state_id: 'fl-1' },
  { id: 'tampa-1', name: 'Tampa', state_id: 'fl-1' },
  
  // Indian Cities
  { id: 'mumbai-1', name: 'Mumbai', state_id: 'mh-1' },
  { id: 'pune-1', name: 'Pune', state_id: 'mh-1' },
  { id: 'delhi-1', name: 'New Delhi', state_id: 'dl-1' },
  { id: 'bangalore-1', name: 'Bangalore', state_id: 'ka-1' },
  { id: 'chennai-1', name: 'Chennai', state_id: 'tn-1' }
]

export const mockPincodes: Pincode[] = [
  // New York Pincodes
  { id: '10001', code: '10001', city_id: 'nyc-1' },
  { id: '10016', code: '10016', city_id: 'manhattan-1' },
  { id: '11201', code: '11201', city_id: 'brooklyn-1' },
  { id: '11375', code: '11375', city_id: 'queens-1' },
  { id: '10451', code: '10451', city_id: 'bronx-1' },
  
  // California Pincodes
  { id: '90210', code: '90210', city_id: 'la-1' },
  { id: '94102', code: '94102', city_id: 'sf-1' },
  { id: '92101', code: '92101', city_id: 'sd-1' },
  
  // Texas Pincodes
  { id: '77001', code: '77001', city_id: 'houston-1' },
  { id: '75201', code: '75201', city_id: 'dallas-1' },
  { id: '73301', code: '73301', city_id: 'austin-1' },
  
  // Florida Pincodes
  { id: '33101', code: '33101', city_id: 'miami-1' },
  { id: '32801', code: '32801', city_id: 'orlando-1' },
  { id: '33602', code: '33602', city_id: 'tampa-1' },
  
  // Indian Pincodes
  { id: '400001', code: '400001', city_id: 'mumbai-1' },
  { id: '411001', code: '411001', city_id: 'pune-1' },
  { id: '110001', code: '110001', city_id: 'delhi-1' },
  { id: '560001', code: '560001', city_id: 'bangalore-1' },
  { id: '600001', code: '600001', city_id: 'chennai-1' }
]

// Helper functions to get filtered data
export const getStatesByCountry = (countryId: string): State[] => {
  return mockStates.filter(state => state.country_id === countryId)
}

export const getCitiesByState = (stateId: string): City[] => {
  return mockCities.filter(city => city.state_id === stateId)
}

export const getPincodesByCity = (cityId: string): Pincode[] => {
  return mockPincodes.filter(pincode => pincode.city_id === cityId)
}

// Get name by ID functions
export const getCountryName = (countryId: string): string => {
  return mockCountries.find(country => country.id === countryId)?.name || 'Unknown'
}

export const getStateName = (stateId: string): string => {
  return mockStates.find(state => state.id === stateId)?.name || 'Unknown'
}

export const getCityName = (cityId: string): string => {
  return mockCities.find(city => city.id === cityId)?.name || 'Unknown'
}

export const getPincodeName = (pincodeId: string): string => {
  return mockPincodes.find(pincode => pincode.id === pincodeId)?.code || 'Unknown'
}
