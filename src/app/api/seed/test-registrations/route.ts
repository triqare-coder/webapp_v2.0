import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Test patients data - gender must be 'Male' or 'Female' (case-sensitive based on DB constraint)
const testPatients = [
  { firstName: 'John', lastName: 'Smith', email: 'john.smith@test.com', phone: '+1-555-0101', gender: 'Male', bloodType: 'O+', dob: '1985-03-15' },
  { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@test.com', phone: '+1-555-0102', gender: 'Female', bloodType: 'A+', dob: '1990-07-22' },
  { firstName: 'Michael', lastName: 'Williams', email: 'michael.williams@test.com', phone: '+1-555-0103', gender: 'Male', bloodType: 'B+', dob: '1978-11-08' },
  { firstName: 'Emily', lastName: 'Brown', email: 'emily.brown@test.com', phone: '+1-555-0104', gender: 'Female', bloodType: 'AB-', dob: '1995-01-30' },
  { firstName: 'David', lastName: 'Davis', email: 'david.davis@test.com', phone: '+1-555-0105', gender: 'Male', bloodType: 'O-', dob: '1982-06-14' },
  { firstName: 'Jessica', lastName: 'Miller', email: 'jessica.miller@test.com', phone: '+1-555-0106', gender: 'Female', bloodType: 'A-', dob: '1988-09-25' },
]

// Test transport companies data
const testTransportCompanies = [
  { firstName: 'Robert', lastName: 'Anderson', email: 'robert@quickambulance.com', phone: '+1-555-0201', companyName: 'Quick Ambulance Services', regNumber: 'REG-001-QAS', address: '123 Medical Drive, New York, NY 10001' },
  { firstName: 'Jennifer', lastName: 'Taylor', email: 'jennifer@citytransport.com', phone: '+1-555-0202', companyName: 'City Medical Transport', regNumber: 'REG-002-CMT', address: '456 Health Ave, Los Angeles, CA 90001' },
  { firstName: 'William', lastName: 'Thomas', email: 'william@rapidresponse.com', phone: '+1-555-0203', companyName: 'Rapid Response EMS', regNumber: 'REG-003-RRE', address: '789 Emergency Blvd, Chicago, IL 60601' },
  { firstName: 'Amanda', lastName: 'Jackson', email: 'amanda@careambulance.com', phone: '+1-555-0204', companyName: 'Care Ambulance Corp', regNumber: 'REG-004-CAC', address: '321 Care Street, Houston, TX 77001' },
  { firstName: 'Christopher', lastName: 'White', email: 'chris@metroems.com', phone: '+1-555-0205', companyName: 'Metro EMS Solutions', regNumber: 'REG-005-MES', address: '654 Metro Way, Phoenix, AZ 85001' },
  { firstName: 'Melissa', lastName: 'Harris', email: 'melissa@lifeline.com', phone: '+1-555-0206', companyName: 'Lifeline Transport Inc', regNumber: 'REG-006-LTI', address: '987 Lifeline Road, Philadelphia, PA 19101' },
]

export async function POST() {
  // Seeds test patient/transport rows into the live DB — never reachable in production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  try {
    const results = { patients: [] as unknown[], transportCompanies: [] as unknown[], errors: [] as string[] }

    // Insert test patients
    for (const patient of testPatients) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', patient.email)
        .single()

      if (existingUser) {
        results.errors.push(`Patient ${patient.email} already exists`)
        continue
      }

      // Create user record
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: `test_patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: patient.email,
          first_name: patient.firstName,
          last_name: patient.lastName,
          full_name: `${patient.firstName} ${patient.lastName}`,
          phone: patient.phone,
          role: 'patient',
          is_active: true
        })
        .select()
        .single()

      if (userError) {
        results.errors.push(`Failed to create patient user ${patient.email}: ${userError.message}`)
        continue
      }

      // Create patient record
      const { data: patientRecord, error: patientError } = await supabase
        .from('patients')
        .insert({
          user_id: user.id,
          dob: patient.dob,
          gender: patient.gender,
          blood_group: patient.bloodType
        })
        .select()
        .single()

      if (patientError) {
        results.errors.push(`Failed to create patient record ${patient.email}: ${patientError.message}`)
        await supabase.from('users').delete().eq('id', user.id)
        continue
      }

      results.patients.push({ user, patient: patientRecord })
    }

    // Insert test transport companies
    for (const company of testTransportCompanies) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', company.email)
        .single()

      if (existingUser) {
        results.errors.push(`Transport company ${company.email} already exists`)
        continue
      }

      // Create user record
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: `test_transport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: company.email,
          first_name: company.firstName,
          last_name: company.lastName,
          full_name: `${company.firstName} ${company.lastName}`,
          phone: company.phone,
          role: 'transport_company',
          is_active: true
        })
        .select()
        .single()

      if (userError) {
        results.errors.push(`Failed to create transport user ${company.email}: ${userError.message}`)
        continue
      }

      // Create transport company record
      const { data: transportRecord, error: transportError } = await supabase
        .from('transport_companies')
        .insert({
          user_id: user.id,
          company_name: company.companyName,
          registration_number: company.regNumber,
          address_line: company.address,
          is_verified: true,
          license_valid_till: '2026-12-31'
        })
        .select()
        .single()

      if (transportError) {
        results.errors.push(`Failed to create transport company ${company.email}: ${transportError.message}`)
        await supabase.from('users').delete().eq('id', user.id)
        continue
      }

      results.transportCompanies.push({ user, transportCompany: transportRecord })
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.patients.length} patients and ${results.transportCompanies.length} transport companies`,
      data: results
    })

  } catch (error: unknown) {
    console.error('Seed error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

