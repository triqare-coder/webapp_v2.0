-- =============================================================================
-- FIX 2026-08-09 — no-driver SOS timeout, enforced INSIDE the database
-- =============================================================================
-- SYMPTOM (reported on an emergency-contact-raised SOS, 2026-08-09)
--   An SOS raised for a patient by their emergency contact still showed
--   "ONGOING EMERGENCY • UPDATES LIVE / Step 2 of 7 · Searching for Driver"
--   five hours later. It never auto-reset, and nobody was ever told that no
--   ambulance was coming.
--
-- PROVEN ON LIVE (2026-08-09, service-role read of sos_requests):
--   b430ffee-a53d-4e40-acd6-878f45d07417  requested 2026-08-08T14:27:33Z
--                                         expires_at 2026-08-08T14:32:33Z
--                                         status 'SOS Triggered', driver_id NULL
--   …still untouched ~17h past its own deadline. Two PATIENT-raised rows from
--   the same day (06:57Z, 07:19Z) were stuck in exactly the same state.
--   => This is NOT an emergency-contact bug. Server-side expiry is dead for
--      everyone. It only ever LOOKED like a patient-side feature because the
--      patient's own app reaps its own request when it happens to be open.
--
-- WHY THIS FILE EXISTS AT ALL
--   Expiry has been attempted twice and both attempts depend on something
--   outside Postgres, which is why neither runs today:
--     1. netlify/functions/expire-sos-requests.mts — the Netlify scheduler has
--        never fired it (documented in netlify.toml and re-proven on 2026-07-30).
--     2. FIX_2026-07-30_sos_expiry_pgcron.sql — pg_cron calling that same
--        Netlify route over pg_net, which needs a CRON_SECRET pasted in by hand.
--        It deliberately RAISEs on the unedited placeholder, so it was never
--        applied and expiry stayed dead.
--   Both route a database-internal decision ("this row is past its deadline")
--   through an HTTP hop, a deploy, a shared secret and a third-party scheduler.
--   Every one of those is a way for a timeout to silently stop happening.
--
--   This file does the expiry in SQL. No secret, no egress, no deploy. The
--   Netlify function and the web reap-on-view can stay exactly as they are —
--   the sweep is idempotent, so a duplicate run is a no-op.
--
-- Run the WHOLE file in the Supabase SQL editor. Idempotent; safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1 — The sweep itself.
--
-- Closes every request that is still unassigned past its own deadline, and
-- returns how many it closed.
--
-- Deliberate choices, each one load-bearing:
--
--   * DEADLINE = COALESCE(expires_at, requested_at + timeout). expires_at is set
--     on INSERT by trg_sos_set_expires_at (migrations/99_updates/sos_expiry.sql,
--     applied — live rows carry it), but rows predating that trigger have NULL,
--     and treating a missing deadline as "no deadline" is what leaves a
--     two-day-old emergency ringing. Matches utils/sos-expiry.ts exactly.
--
--   * driver_id IS NULL. Once a driver has the job the deadline no longer
--     applies — that trip is genuinely running, however long it takes.
--
--   * The terminal status is written as 'Timed Out' where the CHECK constraint
--     permits it and 'Cancelled' where it does not (live today: there is not a
--     single 'Timed Out' row, because sos_lifecycle_timestamps.sql is unapplied).
--     A request that cannot be moved to ANY terminal state keeps ringing every
--     nearby driver forever, so the fallback is not optional.
--
--   * The appended status_history entry carries status='Timed Out' AND
--     actor='system'. That tag is the ONLY thing separating "no ambulance was
--     available" from "you cancelled it" once the row says 'Cancelled'. Three
--     readers key off it and all three must keep working:
--       - utils/sos-outcome.ts  sosOutcome()      → the patient's "No Ambulance
--                                                   Found" label + Call 108
--       - src/lib/push/sosPush.ts isSystemTimeout() → the sos.no_driver push to
--                                                   the patient AND their contacts
--       - the SOS history screens' outcome copy
--
--   * status_history is jsonb that holds a JSON *string* (the mobile client
--     writes JSON.stringify(array), which PostgREST stores as a jsonb string
--     scalar). Every reader on live already handles that shape, so this writes
--     it back the same way rather than "fixing" it underneath them. The
--     normalisation below reads either shape.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_stale_sos_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  timeout_minutes integer;
  closed_count    integer := 0;
  rec             record;
  history         jsonb;
  new_entry       jsonb;
BEGIN
  -- Admin-configurable, with the same 3-minute default as every other reader of
  -- this key. A garbage or non-positive value must not expire every request the
  -- instant it is created.
  SELECT NULLIF(regexp_replace(value, '\D', '', 'g'), '')::integer
    INTO timeout_minutes
    FROM public.configurations
   WHERE key = 'sos_request_timeout_minutes'
   LIMIT 1;

  IF timeout_minutes IS NULL OR timeout_minutes <= 0 THEN
    timeout_minutes := 3;
  END IF;

  FOR rec IN
    SELECT id, status_history
      FROM public.sos_requests
     WHERE status = 'SOS Triggered'
       AND driver_id IS NULL
       AND COALESCE(expires_at, requested_at + make_interval(mins => timeout_minutes)) <= now()
     ORDER BY requested_at
     FOR UPDATE SKIP LOCKED
  LOOP
    -- Unwrap the jsonb-string-holding-an-array shape written by the clients.
    history := COALESCE(rec.status_history, '[]'::jsonb);
    IF jsonb_typeof(history) = 'string' THEN
      BEGIN
        history := (history #>> '{}')::jsonb;
      EXCEPTION WHEN others THEN
        history := '[]'::jsonb;
      END;
    END IF;
    IF jsonb_typeof(history) <> 'array' THEN
      history := '[]'::jsonb;
    END IF;

    new_entry := jsonb_build_object(
      'status',    'Timed Out',
      'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'actor',     'system',
      'note',      'Recorded as Timed Out'
    );
    history := history || jsonb_build_array(new_entry);

    -- Try the honest status first; fall back when the CHECK constraint refuses
    -- it. The sub-block is what makes the fallback possible — a failed
    -- constraint would otherwise abort the whole sweep.
    BEGIN
      UPDATE public.sos_requests
         SET status         = 'Timed Out',
             status_history = to_jsonb(history::text),
             updated_at     = now()
       WHERE id = rec.id
         AND status = 'SOS Triggered'   -- re-checked under the row lock: a driver
         AND driver_id IS NULL;         -- may have claimed it since the SELECT
    EXCEPTION WHEN check_violation THEN
      UPDATE public.sos_requests
         SET status         = 'Cancelled',
             status_history = to_jsonb(history::text),
             updated_at     = now()
       WHERE id = rec.id
         AND status = 'SOS Triggered'
         AND driver_id IS NULL;
    END;

    IF FOUND THEN
      closed_count := closed_count + 1;
    END IF;
  END LOOP;

  RETURN closed_count;
END;
$$;

COMMENT ON FUNCTION public.expire_stale_sos_requests() IS
  'Closes unassigned SOS requests past their deadline as a system timeout (status Timed Out, or Cancelled where the CHECK constraint refuses it, always with an actor=system history entry). Idempotent. Scheduled by pg_cron every minute AND callable by any signed-in client as a reap-on-view backstop.';


-- -----------------------------------------------------------------------------
-- STEP 2 — Let the apps reap on view too.
--
-- The cron below is the real backstop, but the apps must not DEPEND on it having
-- been applied: an emergency contact opening Patient Details is often the first
-- person to look at a stale request, and the previous behaviour was to render it
-- as a live emergency. SECURITY DEFINER + this grant means their tap closes it
-- for everyone, without handing any client write access to sos_requests.
--
-- The function takes no arguments and can only ever move a PAST-DEADLINE,
-- UNASSIGNED request to a terminal state, so there is nothing a caller can aim
-- it at — the worst a hostile caller achieves is running the sweep early.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.expire_stale_sos_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_sos_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_sos_requests() TO service_role;


-- -----------------------------------------------------------------------------
-- STEP 3 — The cadence. Every minute: the shortest sane timeout is measured in
-- minutes, so a 2-minute sweep could leave a request looking live for nearly
-- twice as long as configured.
--
-- Unschedule first so re-running this file never leaves two jobs racing.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('sos-expiry-sweep')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sos-expiry-sweep');

SELECT cron.schedule(
  'sos-expiry-sweep',
  '* * * * *',
  $cron$SELECT public.expire_stale_sos_requests();$cron$
);


-- -----------------------------------------------------------------------------
-- STEP 4 — Prove it. Run this block on its own a couple of minutes after STEP 3.
-- -----------------------------------------------------------------------------

-- (a) The job exists and is active.
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'sos-expiry-sweep';

-- (b) Its recent runs succeeded.
SELECT status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sos-expiry-sweep')
ORDER BY start_time DESC
LIMIT 5;

-- (c) MUST return 0 rows. Every row here is a live-looking emergency that no
--     driver was ever assigned to and that is already past its own deadline —
--     the exact leak this file closes. Before applying, this returned 3 rows,
--     the oldest 17 hours old.
SELECT id, triggered_by, requested_at, expires_at, status
FROM public.sos_requests
WHERE status = 'SOS Triggered'
  AND driver_id IS NULL
  AND expires_at < now()
ORDER BY requested_at DESC;

-- (d) The backfill those 3 rows get is a real status transition, so the push
--     trigger fires sos.no_driver for each one and the patient (and their
--     contacts) are finally told no ambulance came. Confirm the tagging landed:
SELECT id, status, status_history
FROM public.sos_requests
WHERE status IN ('Timed Out', 'Cancelled')
  AND driver_id IS NULL
ORDER BY requested_at DESC
LIMIT 5;
