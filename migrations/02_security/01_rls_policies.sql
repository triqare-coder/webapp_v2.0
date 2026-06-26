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
-- SECURITY: the per-row `OR role = 'admin'` clause was removed. It evaluated the
-- TARGET row's role, not the requester's, so it granted SELECT/UPDATE on every
-- admin account (incl. PII/medical columns) to any session — including anon
-- (anon has SELECT on users, see 02_grants.sql). Admin-wide access must go through
-- a service_role server route with an explicit Clerk admin check, never a
-- row-data-dependent RLS predicate.
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid()::text = clerk_user_id);

-- Allow users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid()::text = clerk_user_id);

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
-- EMERGENCY CONTACTS TABLE POLICIES
-- =============================================
-- emergency_contacts has RLS ENABLED (see top of file) but previously defined NO
-- policy, so the table was deny-all for the authenticated role (only service_role,
-- which bypasses RLS, could touch it). That broke the patient emergency-contacts
-- feature for any non-service-role session and left the table inconsistent with the
-- sibling user-data tables. These policies complete the established clerk-join
-- ownership pattern (emergency_contacts.patient_id == patients.user_id == users.id),
-- scoping every operation to the owning patient. No anon access is granted (the anon
-- role has no table grant in 02_grants.sql), so this strictly improves on deny-all
-- without loosening anything for anonymous callers.

-- Patients can view their own emergency contacts
DROP POLICY IF EXISTS "Patients can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients can view own emergency contacts" ON public.emergency_contacts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = emergency_contacts.patient_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Patients can add their own emergency contacts
DROP POLICY IF EXISTS "Patients can insert own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients can insert own emergency contacts" ON public.emergency_contacts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = emergency_contacts.patient_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Patients can update their own emergency contacts
DROP POLICY IF EXISTS "Patients can update own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients can update own emergency contacts" ON public.emergency_contacts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = emergency_contacts.patient_id
            AND users.clerk_user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = emergency_contacts.patient_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Patients can delete their own emergency contacts
DROP POLICY IF EXISTS "Patients can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients can delete own emergency contacts" ON public.emergency_contacts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = emergency_contacts.patient_id
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

-- Patients can create their own SOS requests
-- Previously sos_requests had ONLY a SELECT policy, so with RLS enabled an
-- authenticated patient could read but never INSERT/UPDATE their own request
-- (deny-all for writes). These complete the same clerk-join ownership pattern,
-- scoping the write to the requesting patient. A separate driver-scoped UPDATE
-- policy (assigned driver advances the trip) is defined in
-- 99_updates/sos_requests_inline_columns.sql, where the inline driver_id column it
-- references is created (that column does not exist at this point in the deploy).
DROP POLICY IF EXISTS "Patients can create own SOS requests" ON public.sos_requests;
CREATE POLICY "Patients can create own SOS requests" ON public.sos_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = sos_requests.patient_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Patients can update their own SOS requests (e.g. cancel)
DROP POLICY IF EXISTS "Patients can update own SOS requests" ON public.sos_requests;
CREATE POLICY "Patients can update own SOS requests" ON public.sos_requests
    FOR UPDATE
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
-- Only announcements that are active AND within their scheduled window are
-- publicly readable; without the window guard an is_active=true row was visible
-- to anon even outside its start_at/end_at schedule.
DROP POLICY IF EXISTS "Active announcements are publicly readable" ON public.announcements;
CREATE POLICY "Active announcements are publicly readable" ON public.announcements
    FOR SELECT
    USING (
        is_active = true
        AND (start_at IS NULL OR start_at <= now())
        AND (end_at IS NULL OR end_at >= now())
    );

-- =============================================
-- END OF RLS POLICIES
-- =============================================

