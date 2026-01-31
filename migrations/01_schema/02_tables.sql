-- =============================================
-- DATABASE TABLES
-- All tables in dependency order
-- =============================================

-- =============================================
-- 1. USERS TABLE (Central Authentication)
-- =============================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'ert', 'transport_company', 'patient', 'driver')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Profile fields
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Emergency contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    
    -- Medical info (for patients)
    medical_conditions TEXT,
    allergies TEXT,
    medications TEXT,
    blood_type VARCHAR(10),
    
    -- Work info (for ERT, drivers)
    department VARCHAR(100),
    position VARCHAR(100),
    employee_id VARCHAR(50),
    
    -- Driver-specific
    license_number VARCHAR(100),
    license_class VARCHAR(50),
    license_expiry DATE,
    medical_cert_expiry DATE,
    years_experience VARCHAR(10),
    special_certifications TEXT,
    languages_spoken VARCHAR(255),
    current_shift VARCHAR(100),
    vehicle_assigned VARCHAR(50),
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_trips INTEGER DEFAULT 0,
    last_trip TIMESTAMP WITH TIME ZONE,
    
    -- Preferences
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC'
);

COMMENT ON TABLE public.users IS 'Central user table synced with Clerk authentication';

-- =============================================
-- 2. LOCATION HIERARCHY TABLES
-- =============================================

-- Countries
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.countries IS 'Country master data';

-- States
CREATE TABLE IF NOT EXISTS public.states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country_id, name)
);

COMMENT ON TABLE public.states IS 'States/provinces within countries';

-- Cities
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state_id UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(state_id, name)
);

COMMENT ON TABLE public.cities IS 'Cities within states';

-- Pincodes
CREATE TABLE IF NOT EXISTS public.pincodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(city_id, code)
);

COMMENT ON TABLE public.pincodes IS 'Postal codes within cities';

-- =============================================
-- 3. HOSPITALS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    hospital_type TEXT CHECK (hospital_type IN ('government', 'private', 'teaching', 'specialty', 'clinic', 'other')),
    address_line TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    website TEXT,
    emergency_contact_person TEXT NOT NULL,
    emergency_contact_phone TEXT NOT NULL,
    emergency_contact_email TEXT,
    country_id UUID REFERENCES public.countries(id),
    state_id UUID REFERENCES public.states(id),
    city_id UUID REFERENCES public.cities(id),
    pincode_id UUID REFERENCES public.pincodes(id),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    general_operating_hours TEXT,
    emergency_department_hours TEXT,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.hospitals IS 'Healthcare facilities in the network';

-- =============================================
-- 4. ROLE-SPECIFIC PROFILE TABLES
-- =============================================

-- Patients
CREATE TABLE IF NOT EXISTS public.patients (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    dob DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    allergies TEXT,
    abha_id VARCHAR(50),
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_valid_till DATE,
    primary_hospital_id UUID REFERENCES public.hospitals(id),
    secondary_hospital_id UUID REFERENCES public.hospitals(id),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    country_id UUID REFERENCES public.countries(id),
    state_id UUID REFERENCES public.states(id),
    city_id UUID REFERENCES public.cities(id),
    pincode_id UUID REFERENCES public.pincodes(id),
    address_line TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.patients IS 'Patient-specific profile data';

-- Transport Companies
CREATE TABLE IF NOT EXISTS public.transport_companies (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    license_number VARCHAR(100),
    license_expiry DATE,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    country_id UUID REFERENCES public.countries(id),
    state_id UUID REFERENCES public.states(id),
    city_id UUID REFERENCES public.cities(id),
    pincode_id UUID REFERENCES public.pincodes(id),
    address_line TEXT,
    total_vehicles INTEGER DEFAULT 0,
    active_drivers INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_trips INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.transport_companies IS 'Transport company profiles';

-- Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    transport_company_id UUID REFERENCES public.transport_companies(user_id) ON DELETE SET NULL,
    license_number VARCHAR(100),
    license_class VARCHAR(50),
    license_expiry DATE,
    medical_cert_expiry DATE,
    years_experience INTEGER,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    current_request_id UUID,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.drivers IS 'Driver profiles and availability status';

-- =============================================
-- 5. EMERGENCY CONTACTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.emergency_contacts IS 'Patient emergency contact information';

-- =============================================
-- 6. SOS OPERATIONS TABLES
-- =============================================

-- SOS Requests
CREATE TABLE IF NOT EXISTS public.sos_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    emergency_type VARCHAR(100),
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    pickup_address TEXT,
    destination_hospital_id UUID REFERENCES public.hospitals(id),
    destination_address TEXT,
    assigned_driver_id UUID REFERENCES public.drivers(user_id),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    estimated_arrival_time TIMESTAMP WITH TIME ZONE,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    completion_time TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.sos_requests IS 'Emergency SOS requests from patients';

-- SOS Request Assignments
CREATE TABLE IF NOT EXISTS public.sos_request_assigned (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sos_request_id UUID NOT NULL REFERENCES public.sos_requests(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.drivers(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.sos_request_assigned IS 'Driver assignment history for SOS requests';

-- =============================================
-- 7. BILLING & SUBSCRIPTION TABLES
-- =============================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans';

-- Patient Subscriptions
CREATE TABLE IF NOT EXISTS public.patient_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(user_id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.patient_subscriptions IS 'Patient subscription records';

-- Billing History
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES public.patient_subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.billing_history IS 'Payment transaction history';

-- =============================================
-- 8. SYSTEM TABLES
-- =============================================

-- Configurations
CREATE TABLE IF NOT EXISTS public.configurations (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.configurations IS 'System configuration key-value store';

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.announcements IS 'System-wide announcements and notifications';

-- Pending CSV Imports
CREATE TABLE IF NOT EXISTS public.pending_csv_imports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('driver', 'patient', 'transport_company')),
    csv_data JSONB NOT NULL,
    invitation_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.pending_csv_imports IS 'Temporary storage for CSV imports pending user signup';

-- =============================================
-- END OF TABLE DEFINITIONS
-- =============================================

