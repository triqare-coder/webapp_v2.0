-- =============================================================================
-- PATCH: driver_push_reachability() — 2026-09-03. Idempotent; safe to re-run.
-- Run AFTER push_device_tokens_lock_read.sql.
-- =============================================================================
--
-- WHY: push_device_tokens_lock_read.sql deliberately revoked SELECT on
-- device_tokens from anon/authenticated, so the token rows are server-only. The
-- portal's driver list reads through DriverService, which uses the ANON client,
-- so its reachability lookup has been failing with 42501 "permission denied for
-- table device_tokens" ever since. That error is swallowed with a console.warn
-- and leaves hasPushToken undefined, which the presence derivation treats as
-- "not looked up" — so every driver whose `status` is still 'available' renders
-- a green "On duty", including the ones with no registered device at all. On
-- live that is 6 of 17: RAJAN KN, Alwin Joseph, Sudheesh Kumar S, Shibu Chacko,
-- Thejus Joseph, Midhun TR. They are shown to operators as dispatchable and an
-- SOS push has nowhere to go.
--
-- This restores the answer without restoring the read grant. The function is a
-- membership test, not a listing: it returns only those of the CALLER-SUPPLIED
-- ids that are drivers with an active device, and never a token string. Joining
-- public.drivers confines it to the fleet, so it cannot be used to probe whether
-- an arbitrary user has the app installed.

CREATE OR REPLACE FUNCTION public.driver_push_reachability(user_ids uuid[])
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT dt.user_id
  FROM public.device_tokens dt
  JOIN public.drivers d ON d.user_id = dt.user_id
  WHERE dt.is_active
    AND dt.user_id = ANY(user_ids);
$$;

COMMENT ON FUNCTION public.driver_push_reachability(uuid[]) IS
  'Which of the given driver ids have an active device_tokens row. SECURITY '
  'DEFINER because device_tokens is not readable by anon/authenticated; returns '
  'ids only, never tokens. Used for the "On duty" vs "No app signal" badge.';

REVOKE ALL ON FUNCTION public.driver_push_reachability(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_push_reachability(uuid[]) TO anon, authenticated, service_role;

-- Verify (read-only): the anon role can call the function but still cannot read
-- the table. Expect: false, true.
SELECT has_table_privilege('anon', 'public.device_tokens', 'SELECT') AS anon_can_read_device_tokens,
       has_function_privilege('anon', 'public.driver_push_reachability(uuid[])', 'EXECUTE') AS anon_can_call_rpc;
