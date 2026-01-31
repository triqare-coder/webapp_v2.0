import type { DatabaseUser } from '@/lib/supabase'

// Convert database user to profile form data
export function mapDatabaseUserToProfile(dbUser: DatabaseUser, role: string) {
  const baseProfile = {
    fullName: dbUser.full_name || `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() || '',
    email: dbUser.email || '',
    phone: dbUser.phone || '',
    bio: dbUser.bio || '',
    department: dbUser.department || getDefaultDepartment(role),
    employeeId: dbUser.employee_id || '',
    lastLogin: dbUser.last_sign_in_at || '',
    accountCreated: dbUser.created_at || ''
  }

  // Add role-specific fields based on available database columns
  const roleSpecificFields: any = {}

  if (role === 'patient') {
    roleSpecificFields.dateOfBirth = dbUser.date_of_birth || ''
    roleSpecificFields.gender = dbUser.gender || ''
    roleSpecificFields.address = dbUser.address || ''
    roleSpecificFields.city = dbUser.city || ''
    roleSpecificFields.state = dbUser.state || ''
    roleSpecificFields.zipCode = dbUser.zip_code || ''
    roleSpecificFields.country = dbUser.country || ''
    roleSpecificFields.emergencyContactName = dbUser.emergency_contact_name || ''
    roleSpecificFields.emergencyContactPhone = dbUser.emergency_contact_phone || ''
    roleSpecificFields.emergencyContactRelationship = dbUser.emergency_contact_relationship || ''
    roleSpecificFields.bloodType = dbUser.blood_type || ''
    roleSpecificFields.allergies = dbUser.allergies || ''
    roleSpecificFields.medicalConditions = dbUser.medical_conditions || ''
    roleSpecificFields.medications = dbUser.medications || ''
    roleSpecificFields.insuranceProvider = dbUser.insurance_provider || ''
    roleSpecificFields.insuranceNumber = dbUser.insurance_number || ''
    roleSpecificFields.lastCheckup = dbUser.last_checkup || ''
  }

  if (role === 'driver') {
    roleSpecificFields.dateOfBirth = dbUser.date_of_birth || ''
    roleSpecificFields.address = dbUser.address || ''
    roleSpecificFields.emergencyContactName = dbUser.emergency_contact_name || ''
    roleSpecificFields.emergencyContactPhone = dbUser.emergency_contact_phone || ''
    roleSpecificFields.licenseNumber = dbUser.license_number || ''
    roleSpecificFields.licenseClass = dbUser.license_class || ''
    roleSpecificFields.licenseExpiry = dbUser.license_expiry || ''
    roleSpecificFields.medicalCertExpiry = dbUser.medical_cert_expiry || ''
    roleSpecificFields.yearsExperience = dbUser.years_experience || ''
    roleSpecificFields.specialCertifications = dbUser.special_certifications || ''
    roleSpecificFields.languagesSpoken = dbUser.languages_spoken || ''
    roleSpecificFields.currentShift = dbUser.current_shift || ''
    roleSpecificFields.vehicleAssigned = dbUser.vehicle_assigned || ''
    roleSpecificFields.rating = dbUser.rating?.toString() || '0.0'
    roleSpecificFields.totalTrips = dbUser.total_trips?.toString() || '0'
    roleSpecificFields.lastTrip = dbUser.last_trip || ''
  }

  if (role === 'transport_company') {
    roleSpecificFields.companyName = dbUser.full_name || ''
    roleSpecificFields.contactPerson = `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim()
    roleSpecificFields.address = dbUser.address || ''
    // Note: Transport company specific fields like registration_number, operating_hours, service_area
    // are stored in the transport_companies table, not in the users table
  }

  if (role === 'ert') {
    roleSpecificFields.position = dbUser.position || ''
    roleSpecificFields.yearsExperience = dbUser.years_experience || ''
    roleSpecificFields.specialCertifications = dbUser.special_certifications || ''
    roleSpecificFields.currentShift = dbUser.current_shift || ''
    roleSpecificFields.emergencyContactName = dbUser.emergency_contact_name || ''
    roleSpecificFields.emergencyContactPhone = dbUser.emergency_contact_phone || ''
  }

  return { ...baseProfile, ...roleSpecificFields }
}

// Convert profile form data to database update object
export function mapProfileToDatabase(profileData: any, role: string) {
  const updateData: any = {}

  // Basic fields that exist in current schema
  if (profileData.fullName !== undefined) {
    updateData.full_name = profileData.fullName
    updateData.first_name = profileData.fullName.split(' ')[0] || ''
    updateData.last_name = profileData.fullName.split(' ').slice(1).join(' ') || ''
  }
  if (profileData.phone !== undefined) updateData.phone = profileData.phone
  if (profileData.department !== undefined) updateData.department = profileData.department
  if (profileData.employeeId !== undefined) updateData.employee_id = profileData.employeeId

  // Generate role-appropriate bio
  updateData.bio = generateBio(profileData, role)

  // Extended fields (only include if they exist in the database schema)
  const extendedFieldMappings = [
    { form: 'dateOfBirth', db: 'date_of_birth' },
    { form: 'gender', db: 'gender' },
    { form: 'address', db: 'address' },
    { form: 'city', db: 'city' },
    { form: 'state', db: 'state' },
    { form: 'zipCode', db: 'zip_code' },
    { form: 'country', db: 'country' },
    { form: 'emergencyContactName', db: 'emergency_contact_name' },
    { form: 'emergencyContactPhone', db: 'emergency_contact_phone' },
    { form: 'emergencyContactRelationship', db: 'emergency_contact_relationship' },
    { form: 'bloodType', db: 'blood_type' },
    { form: 'allergies', db: 'allergies' },
    { form: 'medicalConditions', db: 'medical_conditions' },
    { form: 'medications', db: 'medications' },
    { form: 'insuranceProvider', db: 'insurance_provider' },
    { form: 'insuranceNumber', db: 'insurance_number' },
    { form: 'lastCheckup', db: 'last_checkup' },
    { form: 'licenseNumber', db: 'license_number' },
    { form: 'licenseClass', db: 'license_class' },
    { form: 'licenseExpiry', db: 'license_expiry' },
    { form: 'medicalCertExpiry', db: 'medical_cert_expiry' },
    { form: 'yearsExperience', db: 'years_experience' },
    { form: 'specialCertifications', db: 'special_certifications' },
    { form: 'languagesSpoken', db: 'languages_spoken' },
    { form: 'currentShift', db: 'current_shift' },
    { form: 'vehicleAssigned', db: 'vehicle_assigned' },
    { form: 'rating', db: 'rating' },
    { form: 'totalTrips', db: 'total_trips' },
    { form: 'lastTrip', db: 'last_trip' },
    { form: 'position', db: 'position' }
    // Note: Transport company specific fields like registration_number, operating_hours, service_area
    // are stored in the transport_companies table, not in the users table
  ]

  // Only include fields that have values
  extendedFieldMappings.forEach(({ form, db }) => {
    if (profileData[form] !== undefined && profileData[form] !== '') {
      updateData[db] = profileData[form]
    }
  })

  // Always update timestamp
  updateData.updated_at = new Date().toISOString()

  return updateData
}

function getDefaultDepartment(role: string): string {
  switch (role) {
    case 'admin': return 'Emergency Management'
    case 'ert': return 'Emergency Response Team'
    case 'driver': return 'Transportation'
    case 'transport_company': return 'Transport Services'
    case 'patient': return ''
    default: return 'General'
  }
}

function generateBio(profileData: any, role: string): string {
  switch (role) {
    case 'admin':
      return `System Administrator in ${profileData.department || 'Emergency Management'}`
    case 'patient':
      return `Patient profile${profileData.medicalConditions ? ` with medical conditions: ${profileData.medicalConditions}` : ''}`
    case 'driver':
      return `Emergency Driver${profileData.yearsExperience ? ` with ${profileData.yearsExperience} years experience` : ''}${profileData.specialCertifications ? `. Certifications: ${profileData.specialCertifications}` : ''}`
    case 'transport_company':
      return `Transport Company${profileData.serviceArea ? ` serving ${profileData.serviceArea}` : ''}`
    case 'ert':
      return `Emergency Response Team Member${profileData.position ? ` - ${profileData.position}` : ''}${profileData.specialCertifications ? `. Certifications: ${profileData.specialCertifications}` : ''}`
    default:
      return profileData.bio || ''
  }
}
