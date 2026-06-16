-- =============================================
-- ROLLBACK SCRIPT
-- Remove all database objects created by migration
-- =============================================

-- WARNING: This script will DELETE ALL DATA!
-- Use with extreme caution!

\echo '=========================================='
\echo 'WARNING: Database Rollback Starting'
\echo 'This will DELETE ALL DATA!'
\echo '=========================================='

-- =============================================
-- DROP TABLES (in reverse dependency order)
-- =============================================

\echo ''
\echo 'Dropping Tables...'

DROP TABLE IF EXISTS public.driver_applications CASCADE;
DROP TABLE IF EXISTS public.driver_application_ref_counters CASCADE;
DROP TABLE IF EXISTS public.submission_attempts CASCADE;
DROP TABLE IF EXISTS public.pending_csv_imports CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.configurations CASCADE;
DROP TABLE IF EXISTS public.billing_history CASCADE;
DROP TABLE IF EXISTS public.patient_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.sos_request_assigned CASCADE;
DROP TABLE IF EXISTS public.sos_requests CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.transport_companies CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.hospitals CASCADE;
DROP TABLE IF EXISTS public.pincodes CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;
DROP TABLE IF EXISTS public.states CASCADE;
DROP TABLE IF EXISTS public.countries CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =============================================
-- DROP FUNCTIONS
-- =============================================

\echo ''
\echo 'Dropping Functions...'

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.next_driver_application_ref() CASCADE;
DROP FUNCTION IF EXISTS public.record_submission_attempt(TEXT, TEXT, INTEGER, INTERVAL) CASCADE;

-- =============================================
-- DROP EXTENSIONS (Optional - usually keep these)
-- =============================================

-- Uncomment if you want to remove extensions
-- \echo ''
-- \echo 'Dropping Extensions...'
-- DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- =============================================
-- ROLLBACK COMPLETE
-- =============================================

\echo ''
\echo '=========================================='
\echo 'Rollback Complete!'
\echo 'All tables and data have been removed.'
\echo '=========================================='

