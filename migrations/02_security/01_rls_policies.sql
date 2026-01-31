-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Security policies for data access control
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_request_assigned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_csv_imports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Allow users to read their own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid()::text = clerk_user_id OR role = 'admin');

-- Allow users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid()::text = clerk_user_id OR role = 'admin');

-- Allow service role to insert users
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
CREATE POLICY "Service role can insert users" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- =============================================
-- LOCATION TABLES POLICIES (Public Read)
-- =============================================

-- Countries - Public read
DROP POLICY IF EXISTS "Countries are publicly readable" ON public.countries;
CREATE POLICY "Countries are publicly readable" ON public.countries
    FOR SELECT
    USING (true);

-- States - Public read
DROP POLICY IF EXISTS "States are publicly readable" ON public.states;
CREATE POLICY "States are publicly readable" ON public.states
    FOR SELECT
    USING (true);

-- Cities - Public read
DROP POLICY IF EXISTS "Cities are publicly readable" ON public.cities;
CREATE POLICY "Cities are publicly readable" ON public.cities
    FOR SELECT
    USING (true);

-- Pincodes - Public read
DROP POLICY IF EXISTS "Pincodes are publicly readable" ON public.pincodes;
CREATE POLICY "Pincodes are publicly readable" ON public.pincodes
    FOR SELECT
    USING (true);

-- =============================================
-- HOSPITALS TABLE POLICIES
-- =============================================

-- Hospitals - Public read
DROP POLICY IF EXISTS "Hospitals are publicly readable" ON public.hospitals;
CREATE POLICY "Hospitals are publicly readable" ON public.hospitals
    FOR SELECT
    USING (true);

-- =============================================
-- PATIENTS TABLE POLICIES
-- =============================================

-- Patients can view own data
DROP POLICY IF EXISTS "Patients can view own data" ON public.patients;
CREATE POLICY "Patients can view own data" ON public.patients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = patients.user_id 
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Patients can update own data
DROP POLICY IF EXISTS "Patients can update own data" ON public.patients;
CREATE POLICY "Patients can update own data" ON public.patients
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = patients.user_id 
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- =============================================
-- DRIVERS TABLE POLICIES
-- =============================================

-- Drivers can view own data
DROP POLICY IF EXISTS "Drivers can view own data" ON public.drivers;
CREATE POLICY "Drivers can view own data" ON public.drivers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = drivers.user_id 
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Drivers can update own data
DROP POLICY IF EXISTS "Drivers can update own data" ON public.drivers;
CREATE POLICY "Drivers can update own data" ON public.drivers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = drivers.user_id 
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- =============================================
-- SOS REQUESTS TABLE POLICIES
-- =============================================

-- Patients can view own SOS requests
DROP POLICY IF EXISTS "Patients can view own SOS requests" ON public.sos_requests;
CREATE POLICY "Patients can view own SOS requests" ON public.sos_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = sos_requests.patient_id 
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- =============================================
-- SUBSCRIPTION PLANS TABLE POLICIES
-- =============================================

-- Subscription plans - Public read
DROP POLICY IF EXISTS "Subscription plans are publicly readable" ON public.subscription_plans;
CREATE POLICY "Subscription plans are publicly readable" ON public.subscription_plans
    FOR SELECT
    USING (is_active = true);

-- =============================================
-- ANNOUNCEMENTS TABLE POLICIES
-- =============================================

-- Active announcements - Public read
DROP POLICY IF EXISTS "Active announcements are publicly readable" ON public.announcements;
CREATE POLICY "Active announcements are publicly readable" ON public.announcements
    FOR SELECT
    USING (is_active = true);

-- =============================================
-- END OF RLS POLICIES
-- =============================================

