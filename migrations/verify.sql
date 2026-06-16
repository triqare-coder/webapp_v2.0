-- =============================================
-- VERIFICATION SCRIPT
-- Verify database migration was successful
-- =============================================

\echo '=========================================='
\echo 'Database Migration Verification'
\echo '=========================================='

-- =============================================
-- CHECK EXTENSIONS
-- =============================================

\echo ''
\echo 'Checking Extensions...'
SELECT 
    extname as "Extension Name",
    extversion as "Version"
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto')
ORDER BY extname;

-- =============================================
-- CHECK TABLES
-- =============================================

\echo ''
\echo 'Checking Tables...'
SELECT 
    schemaname as "Schema",
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'Enabled'
        ELSE 'Disabled'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================
-- COUNT TABLES
-- =============================================

\echo ''
\echo 'Table Count Summary:'
SELECT COUNT(*) as "Total Tables" 
FROM pg_tables 
WHERE schemaname = 'public';

-- =============================================
-- CHECK INDEXES
-- =============================================

\echo ''
\echo 'Checking Indexes...'
SELECT 
    schemaname as "Schema",
    tablename as "Table",
    indexname as "Index Name"
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================
-- COUNT INDEXES
-- =============================================

\echo ''
\echo 'Index Count Summary:'
SELECT COUNT(*) as "Total Indexes" 
FROM pg_indexes 
WHERE schemaname = 'public';

-- =============================================
-- CHECK TRIGGERS
-- =============================================

\echo ''
\echo 'Checking Triggers...'
SELECT 
    event_object_table as "Table",
    trigger_name as "Trigger Name",
    event_manipulation as "Event"
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =============================================
-- COUNT TRIGGERS
-- =============================================

\echo ''
\echo 'Trigger Count Summary:'
SELECT COUNT(*) as "Total Triggers" 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- =============================================
-- CHECK RLS POLICIES
-- =============================================

\echo ''
\echo 'Checking RLS Policies...'
SELECT 
    schemaname as "Schema",
    tablename as "Table",
    policyname as "Policy Name",
    cmd as "Command"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- COUNT RLS POLICIES
-- =============================================

\echo ''
\echo 'RLS Policy Count Summary:'
SELECT COUNT(*) as "Total RLS Policies" 
FROM pg_policies 
WHERE schemaname = 'public';

-- =============================================
-- CHECK SEED DATA
-- =============================================

\echo ''
\echo 'Checking Driver Applications (QSoS Phase 2)...'
SELECT to_regclass('public.driver_applications')           IS NOT NULL AS "driver_applications table",
       to_regclass('public.driver_application_ref_counters') IS NOT NULL AS "ref counter table",
       to_regclass('public.submission_attempts')           IS NOT NULL AS "rate-limit table";

\echo ''
\echo 'Driver application helper functions:'
SELECT proname AS "Function"
FROM pg_proc
WHERE proname IN ('next_driver_application_ref', 'record_submission_attempt')
ORDER BY proname;

\echo ''
\echo 'anon must have NO privileges on driver_applications (expect 0 rows):'
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'driver_applications' AND grantee = 'anon';

\echo ''
\echo 'driver-documents storage bucket (expect public = f):'
SELECT id, public FROM storage.buckets WHERE id = 'driver-documents';

\echo ''
\echo 'Checking Seed Data...'

\echo ''
\echo 'Configurations:'
SELECT key, value FROM public.configurations ORDER BY key;

\echo ''
\echo 'Subscription Plans:'
SELECT name, price, billing_cycle, is_active FROM public.subscription_plans ORDER BY price;

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================

\echo ''
\echo '=========================================='
\echo 'Verification Complete!'
\echo '=========================================='

