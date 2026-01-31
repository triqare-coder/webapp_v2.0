export type UserRole = 'admin' | 'ert' | 'transport_company' | 'patient' | 'driver'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
  phoneNumber: string
  address: string
  medicalHistory?: string
  emergencyContact: {
    name: string
    relationship: string
    phoneNumber: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface Hospital {
  id: string
  name: string
  hospital_type: 'government' | 'private' | 'specialty' | 'other'
  address_line: string
  phone: string
  email?: string
  website?: string
  emergency_contact_person: string
  emergency_contact_phone: string
  emergency_contact_email?: string
  country_id?: string
  state_id?: string
  city_id?: string
  pincode_id?: string
  latitude?: number
  longitude?: number
  general_operating_hours?: string
  emergency_department_hours?: string
  additional_notes?: string
  status: 'active' | 'inactive' | 'under_review' | 'suspended'
  created_at: Date
  updated_at: Date
}

export interface Driver {
  id: string
  firstName: string
  lastName: string
  licenseNumber: string
  phoneNumber: string
  email: string
  status: 'available' | 'on_duty' | 'off_duty'
  transportCompanyId: string
  createdAt: Date
  updatedAt: Date
}

export interface Ambulance {
  id: string
  vehicleNumber: string
  type: 'basic' | 'advanced' | 'critical_care'
  status: 'available' | 'dispatched' | 'maintenance' | 'out_of_service'
  currentLocation: {
    lat: number
    lng: number
  }
  driverId?: string
  driver?: Driver
  transportCompanyId: string
  equipment: string[]
  createdAt: Date
  updatedAt: Date
}

export interface TransportCompany {
  id: string
  name: string
  address: string
  phoneNumber: string
  email: string
  licenseNumber: string
  ambulances: Ambulance[]
  drivers: Driver[]
  createdAt: Date
  updatedAt: Date
}

export interface SOSCase {
  id: string
  patientId: string
  patient: Patient
  location: {
    lat: number
    lng: number
    address: string
  }
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled'
  assignedAmbulanceId?: string
  assignedAmbulance?: Ambulance
  assignedHospitalId?: string
  assignedHospital?: Hospital
  assignedById?: string
  assignedBy?: User
  responseTime?: number // in minutes
  completionTime?: number // in minutes
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface SubscriptionPlan {
  id: string
  name: string
  description?: string
  price: number
  duration_days: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface PatientSubscription {
  id: string
  patient_id: string
  plan_id: string
  start_date: Date
  end_date: Date
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  subscription_status: 'active' | 'expired' | 'cancelled'
  transaction_id?: string
  created_at: Date
  updated_at: Date
  // Relations
  patient?: Patient
  plan?: SubscriptionPlan
}

export interface BillingHistory {
  id: string
  patient_id: string
  subscription_id: string
  amount: number
  currency: string
  payment_method?: string
  payment_gateway?: string
  transaction_id: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  invoice_url?: string
  metadata?: Record<string, any>
  created_at: Date
  // Relations
  patient?: Patient
  subscription?: PatientSubscription
}

export interface DashboardStats {
  totalPatients: number
  totalHospitals: number
  totalAmbulances: number
  totalDrivers: number
  activeCases: number
  completedCases: number
  averageResponseTime: number
  availableAmbulances: number
}

export interface EmergencyAssignment {
  id: string
  sosId: string
  ambulanceId: string
  driverId: string
  hospitalId: string
  assignedAt: Date
  estimatedArrival?: Date
  actualArrival?: Date
  status: 'assigned' | 'en_route' | 'arrived' | 'completed'
}
