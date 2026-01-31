import { Patient, Hospital, Driver, Ambulance, TransportCompany, SOSCase, DashboardStats, SubscriptionPlan, PatientSubscription, BillingHistory } from '@/types'

export const mockPatients: Patient[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'male',
    phoneNumber: '+1-555-0101',
    address: '123 Main St, New York, NY 10001',
    medicalHistory: 'Diabetes, Hypertension',
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phoneNumber: '+1-555-0102'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: new Date('1992-07-22'),
    gender: 'female',
    phoneNumber: '+1-555-0201',
    address: '456 Oak Ave, Brooklyn, NY 11201',
    medicalHistory: 'Asthma',
    emergencyContact: {
      name: 'Mike Johnson',
      relationship: 'Brother',
      phoneNumber: '+1-555-0202'
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '3',
    firstName: 'Robert',
    lastName: 'Smith',
    dateOfBirth: new Date('1978-11-08'),
    gender: 'male',
    phoneNumber: '+1-555-0301',
    address: '789 Pine St, Queens, NY 11375',
    emergencyContact: {
      name: 'Lisa Smith',
      relationship: 'Wife',
      phoneNumber: '+1-555-0302'
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
]

export const mockHospitals: Hospital[] = [
  {
    id: '1',
    name: 'New York General Hospital',
    hospital_type: 'government',
    address_line: '100 Hospital Blvd, New York, NY 10001',
    phone: '+1-555-1000',
    email: 'info@nygh.com',
    website: 'https://nygh.com',
    emergency_contact_person: 'Dr. Sarah Johnson',
    emergency_contact_phone: '+1-555-1001',
    emergency_contact_email: 'emergency@nygh.com',
    country_id: 'us-1',
    state_id: 'ny-1',
    city_id: 'nyc-1',
    pincode_id: '10001',
    latitude: 40.7589,
    longitude: -73.9851,
    general_operating_hours: 'Mon-Fri 8:00-20:00',
    emergency_department_hours: '24/7',
    additional_notes: 'Major trauma center with helicopter landing pad',
    status: 'active',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Brooklyn Medical Center',
    hospital_type: 'private',
    address_line: '200 Medical Plaza, Brooklyn, NY 11201',
    phone: '+1-555-2000',
    email: 'contact@bmc.com',
    website: 'https://bmc.com',
    emergency_contact_person: 'Dr. Michael Chen',
    emergency_contact_phone: '+1-555-2001',
    emergency_contact_email: 'emergency@bmc.com',
    country_id: 'us-1',
    state_id: 'ny-1',
    city_id: 'brooklyn-1',
    pincode_id: '11201',
    latitude: 40.6892,
    longitude: -73.9442,
    general_operating_hours: 'Mon-Sun 6:00-22:00',
    emergency_department_hours: '24/7',
    additional_notes: 'Specialized in pediatric and maternity care',
    status: 'active',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Queens Emergency Hospital',
    hospital_type: 'specialty',
    address_line: '300 Emergency Way, Queens, NY 11375',
    phone: '+1-555-3000',
    email: 'emergency@qeh.com',
    website: 'https://qeh.com',
    emergency_contact_person: 'Dr. Lisa Rodriguez',
    emergency_contact_phone: '+1-555-3001',
    emergency_contact_email: 'emergency@qeh.com',
    country_id: 'us-1',
    state_id: 'ny-1',
    city_id: 'queens-1',
    pincode_id: '11375',
    latitude: 40.7282,
    longitude: -73.7949,
    general_operating_hours: 'Mon-Sun 24/7',
    emergency_department_hours: '24/7',
    additional_notes: 'Emergency-only facility with advanced trauma capabilities',
    status: 'active',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
]

export const mockDrivers: Driver[] = [
  {
    id: '1',
    firstName: 'Michael',
    lastName: 'Brown',
    licenseNumber: 'DL123456789',
    phoneNumber: '+1-555-4001',
    email: 'michael.brown@rapidresponse.com',
    status: 'available',
    transportCompanyId: '1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '2',
    firstName: 'Emily',
    lastName: 'Davis',
    licenseNumber: 'DL987654321',
    phoneNumber: '+1-555-4002',
    email: 'emily.davis@rapidresponse.com',
    status: 'on_duty',
    transportCompanyId: '1',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: '3',
    firstName: 'James',
    lastName: 'Wilson',
    licenseNumber: 'DL456789123',
    phoneNumber: '+1-555-4003',
    email: 'james.wilson@cityambulance.com',
    status: 'available',
    transportCompanyId: '2',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  }
]

export const mockAmbulances: Ambulance[] = [
  {
    id: '1',
    vehicleNumber: 'AMB-001',
    type: 'advanced',
    status: 'available',
    currentLocation: { lat: 40.7589, lng: -73.9851 },
    driverId: '1',
    transportCompanyId: '1',
    equipment: ['Defibrillator', 'Oxygen Tank', 'Stretcher', 'First Aid Kit'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    vehicleNumber: 'AMB-002',
    type: 'critical_care',
    status: 'dispatched',
    currentLocation: { lat: 40.6892, lng: -73.9442 },
    driverId: '2',
    transportCompanyId: '1',
    equipment: ['Ventilator', 'Defibrillator', 'Oxygen Tank', 'Stretcher', 'IV Equipment'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '3',
    vehicleNumber: 'AMB-003',
    type: 'basic',
    status: 'available',
    currentLocation: { lat: 40.7282, lng: -73.7949 },
    driverId: '3',
    transportCompanyId: '2',
    equipment: ['First Aid Kit', 'Oxygen Tank', 'Stretcher'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

export const mockTransportCompanies: TransportCompany[] = [
  {
    id: '1',
    name: 'Rapid Response Ambulance Services',
    address: '500 Transport Ave, New York, NY 10001',
    phoneNumber: '+1-555-5000',
    email: 'info@rapidresponse.com',
    licenseNumber: 'TC001',
    ambulances: mockAmbulances.filter(a => a.transportCompanyId === '1'),
    drivers: mockDrivers.filter(d => d.transportCompanyId === '1'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'City Ambulance Corporation',
    address: '600 Emergency Blvd, Brooklyn, NY 11201',
    phoneNumber: '+1-555-6000',
    email: 'contact@cityambulance.com',
    licenseNumber: 'TC002',
    ambulances: mockAmbulances.filter(a => a.transportCompanyId === '2'),
    drivers: mockDrivers.filter(d => d.transportCompanyId === '2'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

export const mockSOSCases: SOSCase[] = [
  {
    id: '1',
    patientId: '1',
    patient: mockPatients[0],
    location: {
      lat: 40.7589,
      lng: -73.9851,
      address: '123 Main St, New York, NY 10001'
    },
    description: 'Chest pain and difficulty breathing',
    severity: 'high',
    status: 'assigned',
    assignedAmbulanceId: '2',
    assignedHospitalId: '1',
    responseTime: 8,
    createdAt: new Date('2024-02-15T10:30:00'),
    updatedAt: new Date('2024-02-15T10:35:00')
  },
  {
    id: '2',
    patientId: '2',
    patient: mockPatients[1],
    location: {
      lat: 40.6892,
      lng: -73.9442,
      address: '456 Oak Ave, Brooklyn, NY 11201'
    },
    description: 'Severe asthma attack',
    severity: 'medium',
    status: 'completed',
    assignedAmbulanceId: '1',
    assignedHospitalId: '2',
    responseTime: 12,
    completionTime: 45,
    createdAt: new Date('2024-02-14T14:20:00'),
    updatedAt: new Date('2024-02-14T15:05:00')
  },
  {
    id: '3',
    patientId: '3',
    patient: mockPatients[2],
    location: {
      lat: 40.7282,
      lng: -73.7949,
      address: '789 Pine St, Queens, NY 11375'
    },
    description: 'Fall with possible fracture',
    severity: 'medium',
    status: 'pending',
    createdAt: new Date('2024-02-15T16:45:00'),
    updatedAt: new Date('2024-02-15T16:45:00')
  }
]

export const mockDashboardStats: DashboardStats = {
  totalPatients: 150,
  totalHospitals: 12,
  totalAmbulances: 25,
  totalDrivers: 30,
  activeCases: 8,
  completedCases: 142,
  averageResponseTime: 11.5,
  availableAmbulances: 18
}

export const mockSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: '1',
    name: 'Basic Plan',
    description: 'Essential emergency response coverage with basic features',
    price: 29.99,
    duration_days: 30,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Premium Plan',
    description: 'Enhanced coverage with priority response and additional features',
    price: 59.99,
    duration_days: 30,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '3',
    name: 'Family Plan',
    description: 'Comprehensive coverage for up to 4 family members',
    price: 99.99,
    duration_days: 30,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '4',
    name: 'Annual Basic',
    description: 'Basic plan with annual billing discount',
    price: 299.99,
    duration_days: 365,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '5',
    name: 'Student Plan',
    description: 'Discounted plan for students with valid ID',
    price: 19.99,
    duration_days: 30,
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-02-01')
  }
]

export const mockPatientSubscriptions: PatientSubscription[] = [
  {
    id: '1',
    patient_id: '1',
    plan_id: '2',
    start_date: new Date('2024-02-01'),
    end_date: new Date('2024-03-01'),
    payment_status: 'paid',
    subscription_status: 'active',
    transaction_id: 'txn_1234567890',
    created_at: new Date('2024-02-01'),
    updated_at: new Date('2024-02-01'),
    patient: mockPatients[0],
    plan: mockSubscriptionPlans[1]
  },
  {
    id: '2',
    patient_id: '2',
    plan_id: '1',
    start_date: new Date('2024-01-15'),
    end_date: new Date('2024-02-15'),
    payment_status: 'paid',
    subscription_status: 'expired',
    transaction_id: 'txn_0987654321',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-02-15'),
    patient: mockPatients[1],
    plan: mockSubscriptionPlans[0]
  },
  {
    id: '3',
    patient_id: '3',
    plan_id: '3',
    start_date: new Date('2024-02-10'),
    end_date: new Date('2024-03-10'),
    payment_status: 'pending',
    subscription_status: 'active',
    transaction_id: 'txn_1122334455',
    created_at: new Date('2024-02-10'),
    updated_at: new Date('2024-02-10'),
    patient: mockPatients[2],
    plan: mockSubscriptionPlans[2]
  },
  {
    id: '4',
    patient_id: '1',
    plan_id: '4',
    start_date: new Date('2024-03-01'),
    end_date: new Date('2025-03-01'),
    payment_status: 'paid',
    subscription_status: 'active',
    transaction_id: 'txn_5566778899',
    created_at: new Date('2024-03-01'),
    updated_at: new Date('2024-03-01'),
    patient: mockPatients[0],
    plan: mockSubscriptionPlans[3]
  }
]

export const mockBillingHistory: BillingHistory[] = [
  {
    id: '1',
    patient_id: '1',
    subscription_id: '1',
    amount: 59.99,
    currency: 'USD',
    payment_method: 'Credit Card',
    payment_gateway: 'Stripe',
    transaction_id: 'txn_1234567890',
    status: 'paid',
    invoice_url: 'https://example.com/invoices/inv_001.pdf',
    metadata: {
      card_last4: '4242',
      card_brand: 'visa'
    },
    created_at: new Date('2024-02-01T10:30:00'),
    patient: mockPatients[0],
    subscription: mockPatientSubscriptions[0]
  },
  {
    id: '2',
    patient_id: '2',
    subscription_id: '2',
    amount: 29.99,
    currency: 'USD',
    payment_method: 'PayPal',
    payment_gateway: 'PayPal',
    transaction_id: 'txn_0987654321',
    status: 'paid',
    invoice_url: 'https://example.com/invoices/inv_002.pdf',
    metadata: {
      paypal_email: 'sarah.johnson@email.com'
    },
    created_at: new Date('2024-01-15T14:20:00'),
    patient: mockPatients[1],
    subscription: mockPatientSubscriptions[1]
  },
  {
    id: '3',
    patient_id: '3',
    subscription_id: '3',
    amount: 99.99,
    currency: 'USD',
    payment_method: 'Bank Transfer',
    payment_gateway: 'Razorpay',
    transaction_id: 'txn_1122334455',
    status: 'pending',
    metadata: {
      bank_name: 'Chase Bank',
      account_last4: '7890'
    },
    created_at: new Date('2024-02-10T09:15:00'),
    patient: mockPatients[2],
    subscription: mockPatientSubscriptions[2]
  },
  {
    id: '4',
    patient_id: '1',
    subscription_id: '4',
    amount: 299.99,
    currency: 'USD',
    payment_method: 'Credit Card',
    payment_gateway: 'Stripe',
    transaction_id: 'txn_5566778899',
    status: 'paid',
    invoice_url: 'https://example.com/invoices/inv_004.pdf',
    metadata: {
      card_last4: '4242',
      card_brand: 'visa',
      discount_applied: 'ANNUAL20'
    },
    created_at: new Date('2024-03-01T11:45:00'),
    patient: mockPatients[0],
    subscription: mockPatientSubscriptions[3]
  },
  {
    id: '5',
    patient_id: '2',
    subscription_id: '2',
    amount: 29.99,
    currency: 'USD',
    payment_method: 'Credit Card',
    payment_gateway: 'Stripe',
    transaction_id: 'txn_failed_001',
    status: 'failed',
    metadata: {
      card_last4: '0000',
      card_brand: 'visa',
      failure_reason: 'insufficient_funds'
    },
    created_at: new Date('2024-02-15T16:30:00'),
    patient: mockPatients[1],
    subscription: mockPatientSubscriptions[1]
  }
]
