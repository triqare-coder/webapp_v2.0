-- =============================================
-- MASTER DEPLOYMENT SCRIPT
-- Execute all migration files in correct order
-- =============================================

-- This script deploys the complete database schema
-- Run this on a fresh Supabase instance

\echo '=========================================='
\echo 'Starting Database Migration'
\echo '=========================================='

-- =============================================
-- STEP 1: EXTENSIONS
-- =============================================

\echo ''
\echo 'Step 1: Installing PostgreSQL Extensions...'
\i 01_schema/01_extensions.sql

-- =============================================
-- STEP 2: SCHEMA - TABLES
-- =============================================

\echo ''
\echo 'Step 2: Creating Database Tables...'
\i 01_schema/02_tables.sql

-- =============================================
-- STEP 3: SCHEMA - INDEXES
-- =============================================

\echo ''
\echo 'Step 3: Creating Performance Indexes...'
\i 01_schema/03_indexes.sql

-- =============================================
-- STEP 4: SCHEMA - CONSTRAINTS
-- =============================================

\echo ''
\echo 'Step 4: Adding Foreign Key Constraints...'
\i 01_schema/04_constraints.sql

-- =============================================
-- STEP 5: SCHEMA - TRIGGERS
-- =============================================

\echo ''
\echo 'Step 5: Creating Triggers and Functions...'
\i 01_schema/05_triggers.sql

-- =============================================
-- STEP 5b: DRIVER APPLICATIONS (QSoS Phase 2)
-- =============================================

\echo ''
\echo 'Step 5b: Creating Driver Applications table + functions...'
\i 01_schema/06_driver_applications.sql

-- =============================================
-- STEP 6: SECURITY - RLS POLICIES
-- =============================================

\echo ''
\echo 'Step 6: Applying Row Level Security Policies...'
\i 02_security/01_rls_policies.sql
\i 02_security/03_driver_applications_rls.sql

-- =============================================
-- STEP 7: SECURITY - GRANTS
-- =============================================

\echo ''
\echo 'Step 7: Granting Database Permissions...'
\i 02_security/02_grants.sql

-- =============================================
-- STEP 8: SEED DATA - CONFIGURATIONS
-- =============================================

\echo ''
\echo 'Step 8: Inserting System Configurations...'
\i 03_seed/01_configurations.sql

-- =============================================
-- STEP 9: SEED DATA - SUBSCRIPTION PLANS
-- =============================================

\echo ''
\echo 'Step 9: Inserting Subscription Plans...'
\i 03_seed/02_subscription_plans.sql

-- =============================================
-- DEPLOYMENT COMPLETE
-- =============================================

\echo ''
\echo '=========================================='
\echo 'Database Migration Completed Successfully!'
\echo '=========================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Verify all tables exist'
\echo '2. Configure Clerk webhook URL'
\echo '3. Update environment variables'
\echo '4. Test authentication flow'
\echo '=========================================='

