-- =============================================
-- PERMISSION GRANTS
-- Database access permissions
-- =============================================

-- =============================================
-- GRANT USAGE ON SCHEMA
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- =============================================
-- GRANT TABLE PERMISSIONS
-- =============================================

-- Users table
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated, service_role;
GRANT SELECT ON public.users TO anon;

-- Location tables (public read)
GRANT SELECT ON public.countries TO anon, authenticated, service_role;
GRANT SELECT ON public.states TO anon, authenticated, service_role;
GRANT SELECT ON public.cities TO anon, authenticated, service_role;
GRANT SELECT ON public.pincodes TO anon, authenticated, service_role;

-- Hospitals (public read)
GRANT SELECT ON public.hospitals TO anon, authenticated, service_role;

-- Profile tables
GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.transport_companies TO authenticated, service_role;

-- Emergency contacts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated, service_role;

-- SOS operations
GRANT SELECT, INSERT, UPDATE ON public.sos_requests TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.sos_request_assigned TO authenticated, service_role;

-- Subscriptions
GRANT SELECT ON public.subscription_plans TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.patient_subscriptions TO authenticated, service_role;
GRANT SELECT, INSERT ON public.billing_history TO authenticated, service_role;

-- System tables
GRANT SELECT ON public.configurations TO authenticated, service_role;
GRANT SELECT ON public.announcements TO anon, authenticated, service_role;

-- Pending imports (service role only)
GRANT ALL ON public.pending_csv_imports TO service_role;

-- =============================================
-- GRANT SEQUENCE PERMISSIONS
-- =============================================

-- Grant usage on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- =============================================
-- END OF PERMISSION GRANTS
-- =============================================

