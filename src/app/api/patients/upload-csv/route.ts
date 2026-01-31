import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClerkUser } from '@/lib/clerk-user-creation'
import { auth } from '@clerk/nextjs/server'

interface CSVPatient {
  full_name: string
  email: string
  phone?: string
  dob?: string
  gender?: string
  blood_group?: string
  allergies?: string
  abha_id?: string
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_valid_till?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  latitude?: string
  longitude?: string
  address_line?: string
  country_name?: string
  state_name?: string
  city_name?: string
  pincode?: string
}

// Parse date from various formats to PostgreSQL format (YYYY-MM-DD)
function parseDate(dateStr?: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  const cleaned = dateStr.trim()

  // Try DD-MM-YYYY format (e.g., 15-01-1990)
  const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try DD/MM/YYYY format (e.g., 15/01/1990)
  const ddmmyyyySlashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyySlashMatch) {
    const [, day, month, year] = ddmmyyyySlashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try YYYY-MM-DD format (already correct)
  const yyyymmddMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try ISO format (e.g., 2024-01-15T00:00:00.000Z)
  try {
    const date = new Date(cleaned)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  } catch (e) {
    // Invalid date
  }

  console.warn(`Could not parse date: ${dateStr}`)
  return null
}

// Parse CSV string to array of objects
function parseCSV(csvText: string): CSVPatient[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const records: CSVPatient[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || ''
    })
    records.push(record as unknown as CSVPatient)
  }

  return records
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Lookup location IDs by name
async function lookupLocationIds(record: CSVPatient) {
  let country_id = null, state_id = null, city_id = null, pincode_id = null

  if (record.country_name) {
    const { data: country } = await supabase
      .from('countries')
      .select('id')
      .ilike('name', record.country_name.trim())
      .single()
    country_id = country?.id || null
  }

  if (country_id && record.state_name) {
    const { data: state } = await supabase
      .from('states')
      .select('id')
      .eq('country_id', country_id)
      .ilike('name', record.state_name.trim())
      .single()
    state_id = state?.id || null
  }

  if (state_id && record.city_name) {
    const { data: city } = await supabase
      .from('cities')
      .select('id')
      .eq('state_id', state_id)
      .ilike('name', record.city_name.trim())
      .single()
    city_id = city?.id || null
  }

  if (city_id && record.pincode) {
    const { data: pincode } = await supabase
      .from('pincodes')
      .select('id')
      .eq('city_id', city_id)
      .ilike('code', record.pincode.trim())
      .single()
    pincode_id = pincode?.id || null
  }

  return { country_id, state_id, city_id, pincode_id }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user for invitation tracking
    const { userId: currentUserId } = await auth()

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()
    const records = parseCSV(csvText)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      usersCreated: 0,
      createdUsers: [] as any[]
    }

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.full_name || !record.email) {
          results.errors.push(`Row missing required fields: ${record.full_name || record.email || 'Unknown'}`)
          results.failed++
          continue
        }

        // Check if email already exists in database
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', record.email.trim())
          .single()

        if (existingUser) {
          results.errors.push(`Email already exists: ${record.email}`)
          results.failed++
          continue
        }

        // Create user directly in Clerk
        const userCreationResult = await createClerkUser(
          record.email.trim(),
          record.full_name.trim(),
          'patient',
          record.phone
        )

        if (!userCreationResult.success) {
          results.errors.push(`Failed to create user ${record.email}: ${userCreationResult.error}`)
          results.failed++
          continue
        }

        // Get location IDs
        const locationIds = await lookupLocationIds(record)

        // Create user record in Supabase
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            clerk_user_id: userCreationResult.clerkUserId,
            email: record.email.trim(),
            full_name: record.full_name.trim(),
            phone: record.phone || null,
            role: 'patient'
          })
          .select()
          .single()

        if (userError || !newUser) {
          results.errors.push(`Failed to create user record for ${record.email}: ${userError?.message}`)
          results.failed++
          continue
        }

        // Create patient record
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            user_id: newUser.id,
            dob: parseDate(record.dob),
            gender: record.gender && ['Male', 'Female', 'Other'].includes(record.gender) ? record.gender : null,
            blood_group: record.blood_group && ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(record.blood_group) ? record.blood_group : null,
            allergies: record.allergies || null,
            abha_id: record.abha_id || null,
            insurance_provider: record.insurance_provider || null,
            insurance_policy_number: record.insurance_policy_number || null,
            insurance_valid_till: parseDate(record.insurance_valid_till),
            emergency_contact_name: record.emergency_contact_name || null,
            emergency_contact_phone: record.emergency_contact_phone || null,
            emergency_contact_relation: record.emergency_contact_relation || null,
            latitude: record.latitude ? parseFloat(record.latitude) : null,
            longitude: record.longitude ? parseFloat(record.longitude) : null,
            address_line: record.address_line || null,
            ...locationIds
          })

        if (patientError) {
          results.errors.push(`Failed to create patient record for ${record.email}: ${patientError.message}`)
          results.failed++
        } else {
          results.success++
          results.usersCreated++
          results.createdUsers.push({
            email: record.email,
            full_name: record.full_name,
            role: 'patient'
          })
        }
      } catch (err) {
        results.errors.push(`Error processing ${record.full_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        results.failed++
      }
    }

    return NextResponse.json({
      message: `Created ${results.usersCreated} patients successfully. ${results.failed} failed. Users can login by resetting their password.`,
      ...results
    })
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process CSV' },
      { status: 500 }
    )
  }
}

