-- =============================================================================
-- DIAGNOSE 2026-08-09 — the trigger fires, pg_net queues, the POST never lands
-- =============================================================================
-- WHAT WE KNOW ALREADY
--   net._http_response holds rows whose `created` matches yesterday's SOS events
--   exactly (15:00:30, 14:27:33, 13:14:32, 13:11:35, 12:52:14), every one with
--   status_code NULL and content NULL. So:
--     * trg_notify_push_on_sos_change IS firing,
--     * pg_net IS queueing the request,
--     * the HTTP call itself fails — and the reason is in `error_msg`, which
--       STEP 4c of FIX_2026-07-30_sos_dispatch_trigger.sql did not select.
--
--   Meanwhile POSTing the same URL + secret from a laptop returns 200. The route,
--   the secret and Firebase are all fine. Only Postgres cannot get out.
--
-- Read-only apart from STEP 5, which is called out explicitly.
-- Run each step and keep the output.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1 — THE ANSWER. Why did each request fail?
--
--   error_msg 'Timeout was reached'      -> egress blocked or too slow; raise the
--                                           timeout in STEP 5a and retest.
--   error_msg mentioning DNS / resolve   -> the DB cannot resolve the hostname.
--   error_msg 'Connection refused'/TLS   -> network path exists, handshake fails.
--   timed_out = true, error_msg NULL     -> same as the timeout case.
--   ALL columns NULL                     -> the worker recorded a slot but never
--                                           ran the request; go to STEP 3.
-- -----------------------------------------------------------------------------
SELECT id,
       status_code,
       timed_out,
       error_msg,
       created
FROM   net._http_response
ORDER  BY id DESC
LIMIT  20;


-- -----------------------------------------------------------------------------
-- STEP 2 — Did STEP 3 of the fix file actually run, and is anything stuck?
--
-- A row here dated today means the self-test POST is QUEUED BUT UNPROCESSED,
-- which points at the background worker rather than the network.
-- An empty result plus no new _http_response row means STEP 3 was never run —
-- go back and run the whole fix file top to bottom.
-- -----------------------------------------------------------------------------
SELECT id, method, url, timeout_milliseconds
FROM   net.http_request_queue
ORDER  BY id DESC
LIMIT  20;


-- -----------------------------------------------------------------------------
-- STEP 3 — Is the pg_net worker alive at all?
--
-- pg_net runs a background worker. A Postgres restart or extension upgrade can
-- leave it dead, and the symptom is exactly this: requests queue, nothing
-- completes, no error is raised anywhere.
-- Expect one row with backend_type 'pg_net worker'. NO ROW = the worker is dead.
-- -----------------------------------------------------------------------------
SELECT pid, backend_type, state, backend_start
FROM   pg_stat_activity
WHERE  backend_type ILIKE '%pg_net%';

-- Which version is installed? Older builds record failures far less usefully.
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net';


-- -----------------------------------------------------------------------------
-- STEP 4 — Confirm the parts of the fix we have not yet seen output for.
-- (You showed STEP 4c yesterday but not 4a/4b.)
--
-- 4a: expect ONE row, enabled_O_means_yes = 'O'.
-- 4b: expect secret_is_placeholder = false AND has_https_url = true.
--     If secret_is_placeholder is true, the fix file never actually applied.
-- -----------------------------------------------------------------------------
SELECT tgname, tgenabled AS enabled_O_means_yes
FROM   pg_trigger
WHERE  tgrelid = 'public.sos_requests'::regclass
  AND  tgname  = 'trg_notify_push_on_sos_change';

SELECT pg_get_functiondef('public.notify_push_on_sos_change()'::regprocedure)
         LIKE '%REPLACE_WITH_PUSH_DISPATCH_SECRET%' AS secret_is_placeholder,
       pg_get_functiondef('public.notify_push_on_sos_change()'::regprocedure)
         LIKE '%https://triqareweb20.netlify.app/api/push/dispatch%' AS has_https_url;


-- =============================================================================
-- STEP 5 — REMEDIES. These WRITE. Run only the one STEP 1–3 pointed you at.
-- =============================================================================

-- 5a. Timeout case. 5s is tight for a cold Netlify function: the first request
--     after an idle period pays a container cold start. Retest with 15s.
SELECT net.http_post(
  url     := 'https://triqareweb20.netlify.app/api/push/dispatch',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer aff09a5fc2b78aeac9aaa76abf114e567cd754b9ca732c6f6b4f1c8a46499605'
  ),
  body    := jsonb_build_object(
    'request_id', '00000000-0000-0000-0000-000000000000',
    'new_status', 'SOS Triggered'
  ),
  timeout_milliseconds := 15000
) AS retry_15s_request_id;
-- Wait ~20s, then re-run STEP 1. A 200 here means the trigger only ever needed a
-- longer timeout, and the permanent fix is to widen it inside the function.

-- 5b. Dead-worker case (STEP 3 returned no row). Restarts the worker only; it
--     does not touch data and does not interrupt connections.
-- SELECT net.worker_restart();
-- Then re-run 5a and STEP 1.
-- =============================================================================
