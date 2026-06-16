-- =============================================
-- DRIVER APPLICATIONS — ROW LEVEL SECURITY
-- =============================================
--
-- Deny-by-default for anon/authenticated. There are intentionally NO policies
-- for those roles, so every public write and every admin read/update must go
-- through a service-role server route (service_role bypasses RLS). Admin
-- identity lives in Clerk (publicMetadata.role), not Supabase Auth, so an
-- auth.uid()-based policy would never match — authorization is enforced in the
-- API handlers instead. The actual lockout is the grant omission in
-- 02_security/02_grants.sql (no anon/authenticated grant on these tables).

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_application_ref_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_attempts ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: explicitly grant service_role full access (it bypasses
-- RLS regardless; this documents intent). No anon/authenticated policies exist.
DROP POLICY IF EXISTS "service role manages driver applications" ON public.driver_applications;
CREATE POLICY "service role manages driver applications" ON public.driver_applications
    FOR ALL TO service_role USING (true) WITH CHECK (true);
