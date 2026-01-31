import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/debug/emergency-contacts - Test emergency contacts functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')

    // Test 1: Get all emergency contacts
    const { data: allContacts, error: allError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .limit(10)

    // Test 2: Get emergency contacts for specific patient if provided
    let patientContacts = null
    let patientError = null
    if (patientId) {
      const result = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('patient_id', patientId)
      
      patientContacts = result.data
      patientError = result.error
    }

    // Test 3: Get patients with their emergency contacts
    const { data: patientsWithContacts, error: joinError } = await supabase
      .from('patients')
      .select(`
        user_id,
        users!inner (
          id,
          full_name,
          email
        )
      `)
      .limit(5)

    // Get emergency contacts for these patients
    const patientIds = patientsWithContacts?.map(p => p.user_id) || []
    const { data: contactsForPatients, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .in('patient_id', patientIds)

    // Group contacts by patient
    const contactsByPatient = contactsForPatients?.reduce((acc, contact) => {
      if (!acc[contact.patient_id]) {
        acc[contact.patient_id] = []
      }
      acc[contact.patient_id].push(contact)
      return acc
    }, {} as Record<string, any[]>) || {}

    const patientsWithContactsData = patientsWithContacts?.map(patient => ({
      ...patient,
      emergency_contacts: contactsByPatient[patient.user_id] || []
    }))

    return NextResponse.json({
      success: true,
      tests: [
        {
          test: 'All Emergency Contacts',
          status: allError ? 'FAILED' : 'PASSED',
          error: allError?.message,
          data: {
            count: allContacts?.length || 0,
            sample: allContacts?.slice(0, 3)
          }
        },
        ...(patientId ? [{
          test: `Emergency Contacts for Patient ${patientId}`,
          status: patientError ? 'FAILED' : 'PASSED',
          error: patientError?.message,
          data: {
            count: patientContacts?.length || 0,
            contacts: patientContacts
          }
        }] : []),
        {
          test: 'Patients with Emergency Contacts Join',
          status: (joinError || contactsError) ? 'FAILED' : 'PASSED',
          error: joinError?.message || contactsError?.message,
          data: {
            patients_count: patientsWithContacts?.length || 0,
            contacts_count: contactsForPatients?.length || 0,
            sample: patientsWithContactsData?.slice(0, 2)
          }
        }
      ],
      summary: {
        total_emergency_contacts: allContacts?.length || 0,
        total_patients_tested: patientsWithContacts?.length || 0,
        contacts_distribution: contactsByPatient
      }
    })

  } catch (error) {
    console.error('Error in emergency contacts debug:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
