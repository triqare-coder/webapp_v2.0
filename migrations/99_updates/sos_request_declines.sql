-- =============================================
-- SOS REQUEST DECLINES — driver "Reject" on an emergency call
-- Incremental patch. Apply like the other 99_updates patches.
-- =============================================
--
-- Drivers asked for the incoming SOS to RING until they answer it. "Answer"
-- needs two doors, and until now the driver dashboard only had one (Accept).
-- This table is the second door.
--
-- Why a table and not just local state: the dashboard re-polls nearby requests
-- every 10 seconds and also streams them over realtime. A decline that lived
-- only in component state would be undone by the very next poll — the card
-- would pop back and the phone would start ringing again, which is the exact
-- opposite of what the driver asked for. The decline has to outlive the poll,
-- the screen, and an app restart.
--
-- Semantics: a decline is PER DRIVER, not global. The SOS request itself is
-- untouched and stays 'SOS Triggered' — it remains live and dispatchable to
-- every other nearby driver. This is a "not me", not a cancellation.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.sos_request_declines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_request_id  UUID NOT NULL REFERENCES public.sos_requests(id) ON DELETE CASCADE,
    driver_id       UUID NOT NULL REFERENCES public.users(id)        ON DELETE CASCADE,
    declined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A driver can only decline a given request once. The app upserts against
    -- this, so a double-tap on Reject is a no-op rather than a duplicate row.
    CONSTRAINT sos_request_declines_unique UNIQUE (sos_request_id, driver_id)
);

-- The hot path is "give me every request this driver has already declined", run
-- on every dashboard load and every 10s poll.
CREATE INDEX IF NOT EXISTS idx_sos_request_declines_driver
    ON public.sos_request_declines (driver_id);

CREATE INDEX IF NOT EXISTS idx_sos_request_declines_request
    ON public.sos_request_declines (sos_request_id);

COMMENT ON TABLE  public.sos_request_declines IS
    'Per-driver "Reject" on an SOS request. Suppresses the request (and its ringer) for that driver only; the request stays live for all other drivers.';
COMMENT ON COLUMN public.sos_request_declines.driver_id IS
    'FK to users.id — the same id the app passes to acceptSOSRequest(), NOT drivers.id.';

-- updated_at trigger, matching every other table (see
-- 99_updates/add_missing_updated_at_columns.sql — a table whose UPDATE trigger
-- references a column it does not have raises 42703 and breaks all writes).
DROP TRIGGER IF EXISTS update_sos_request_declines_updated_at ON public.sos_request_declines;
CREATE TRIGGER update_sos_request_declines_updated_at
    BEFORE UPDATE ON public.sos_request_declines
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
-- The mobile app talks to Supabase with the ANON key and no Supabase session,
-- so every driver write lands as Postgres role `anon` (see STAGED-AUTH-PLAN.md
-- §0). RLS keyed on auth.uid() is therefore not enforced for it today, and the
-- app's existing sos_requests reads/writes succeed on that basis.
--
-- We deliberately mirror that reality rather than shipping a policy that would
-- silently reject every Reject tap. Enabling RLS here with a Clerk-sub policy
-- BEFORE the client sends a Clerk token would make declines fail-closed — the
-- exact trap section 0 of the staged-auth plan warns about.
GRANT SELECT, INSERT, DELETE ON public.sos_request_declines TO anon, authenticated, service_role;

-- Keep Reject working whether RLS is ON or OFF. The Supabase Table Editor
-- auto-enables RLS on tables from the UI, and with no anon policy that fails
-- EVERY driver Reject closed with "42501: new row violates row-level security
-- policy" (observed in prod 2026-07-20: reject rolled back, so the call kept
-- ringing until someone accepted it). A bare DISABLE reverts to fail-closed the
-- next time someone opens the table in the UI, so instead we ENABLE RLS with a
-- PERMISSIVE policy: writes succeed regardless. The app is anon-key with no
-- Clerk token yet, so this permissive policy stands in until the Clerk-JWT
-- cutover swaps in the owner-scoped policies below.
ALTER TABLE public.sos_request_declines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sos_request_declines permissive rw" ON public.sos_request_declines;
CREATE POLICY "sos_request_declines permissive rw" ON public.sos_request_declines
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- STAGED: enable together with the Clerk-JWT cutover, NOT before.
-- Uncomment as part of the same change that makes lib/supabase.ts attach the
-- Clerk token (STAGED-AUTH-PLAN.md §2), alongside the other sub-claim policies.
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.sos_request_declines ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "Drivers can view own declines" ON public.sos_request_declines;
-- CREATE POLICY "Drivers can view own declines" ON public.sos_request_declines
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM public.users
--             WHERE users.id = sos_request_declines.driver_id
--               AND users.clerk_user_id = auth.jwt() ->> 'sub'
--         )
--     );
--
-- DROP POLICY IF EXISTS "Drivers can create own declines" ON public.sos_request_declines;
-- CREATE POLICY "Drivers can create own declines" ON public.sos_request_declines
--     FOR INSERT WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM public.users
--             WHERE users.id = sos_request_declines.driver_id
--               AND users.clerk_user_id = auth.jwt() ->> 'sub'
--         )
--     );
