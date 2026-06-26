-- =============================================
-- EMERGENCY CONTACTS — EMAIL + RELATIONSHIP + PHOTO
-- Incremental patch to the live emergency_contacts table.
-- Apply like the other 99_updates patches.
-- =============================================
--
-- Mobile-app (QSoS) feedback:
--   * Email is now a MANDATORY field on every emergency contact. The column
--     already exists in the base schema (nullable); the app layer enforces it
--     as required for new/edited contacts. We keep it nullable in the DB so
--     legacy rows created before this change are untouched.
--   * Relationship was already present — no DB change needed.
--   * Each contact can carry an optional photo. Photos are stored inline as a
--     small resized base64 data URI (the app downscales to ~256px before save),
--     so no storage bucket / RLS is required — the existing insert path handles
--     the write unchanged. NOTE: emergency_contacts has no anon grant and only
--     SELECT/UPDATE RLS policies (see 02_security/02_grants.sql and
--     01_rls_policies.sql); writes must go through a service-role server route,
--     not the anon client, or the INSERT is denied by RLS.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.emergency_contacts
  ADD COLUMN IF NOT EXISTS email      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS photo_url  TEXT;

COMMENT ON COLUMN public.emergency_contacts.email IS 'Contact email — required by the app for new/edited contacts; nullable for legacy rows.';
COMMENT ON COLUMN public.emergency_contacts.photo_url IS 'Optional contact photo as a small resized base64 data URI (~256px). No storage bucket needed.';
