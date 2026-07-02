-- =============================================
-- ADD MISSING updated_at COLUMNS (repairs the shared BEFORE UPDATE trigger)
-- Incremental patch to the live database. Apply like the other 99_updates patches.
-- =============================================
--
-- ROOT CAUSE
--   01_schema/05_triggers.sql attaches the shared trigger function
--   update_updated_at_column() (which runs `NEW.updated_at = NOW()`) as a
--   BEFORE UPDATE trigger to ~18 tables. The base schema (01_schema/02_tables.sql)
--   defines an `updated_at` column on every one of those tables — but prod was
--   built from an older schema, so several tables have the TRIGGER without the
--   COLUMN. Any UPDATE on those tables therefore fails with:
--       ERROR: record "new" has no field "updated_at"  (SQLSTATE 42703)
--
--   Verified live (2026-07-01) via a read-only PostgREST probe
--   (GET /rest/v1/<table>?select=updated_at&limit=1):
--     MISSING the column: patients, drivers, sos_requests, sos_request_assigned,
--                         transport_companies, announcements, pending_csv_imports,
--                         countries, states, cities, pincodes
--     Already present:    users, emergency_contacts, patient_subscriptions,
--                         hospitals, subscription_plans, billing_history, configurations
--
-- IMPACT (observed on the mobile app)
--   * patients             -> patient Profile screen "Unable to load profile"
--                             (ensurePatientRecord upsert -> UPDATE fails)
--   * sos_requests         -> patient CANNOT cancel an SOS ("Could not cancel"),
--                             and no SOS status transition can persist
--   * drivers              -> "Failed to update driver location / status"
--   * sos_request_assigned -> driver assignment updates fail
--
-- FIX
--   Add the missing column (type matches the base schema:
--   TIMESTAMP WITH TIME ZONE DEFAULT NOW()). Adding a column with a DEFAULT
--   backfills existing rows automatically, so the trigger has a field to write.
--
-- Idempotent & additive: safe to re-run; touches no existing data or app code;
-- no APK rebuild required.

ALTER TABLE public.patients              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.drivers               ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.sos_requests          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.sos_request_assigned  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.transport_companies   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.announcements         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.pending_csv_imports   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.countries             ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.states                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.cities                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.pincodes              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
