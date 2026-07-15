-- =============================================
-- PUSH NOTIFICATIONS — schema drift fix + SOS dispatch trigger
-- Incremental patch. Apply like the other 99_updates patches. Idempotent.
-- =============================================
--
-- Three things happen here:
--
--   1. Reconcile two columns the live code already writes but that exist in NO
--      migration (a DB rebuilt from deploy.sql breaks on both):
--        * users.fcm_token / users.fcm_token_updated_at  — written by the mobile
--          app (Triqare-app/services/user-service.ts updateUserFcmToken). Without
--          them, FCM token registration 500s and no device can ever be pushed to.
--        * drivers.status — read/written by both clients with the values
--          available|assigned|on_trip|inactive (Triqare-app/services/driver-service.ts,
--          src/services/sosRequestService.ts). 02_tables.sql only ever defined
--          is_available BOOLEAN.
--
--   2. Emit a push-dispatch webhook whenever an SOS request is created or changes
--      status, so every write path — patient app, driver app, ER-team/admin
--      dashboard, and the timeout reaper — produces notifications from ONE place.
--      Doing this in the database rather than in each client is deliberate: the
--      mobile apps write to Supabase directly, so a client-side dispatch would be
--      lost whenever the app is killed or the network drops right after the write
--      (exactly the situation an emergency app must survive).
--
--   3. Seed the dispatch radius config the driver app already reads.
--
-- The webhook target and its bearer secret are read from database-level GUCs so
-- the secret is never stored in a PostgREST-readable table. Set them once, as a
-- superuser, on the Supabase project (SQL editor):
--
--   ALTER DATABASE postgres SET app.push_dispatch_url    = 'https://<site>/api/push/dispatch';
--   ALTER DATABASE postgres SET app.push_dispatch_secret = '<same value as PUSH_DISPATCH_SECRET env>';
--
-- and then reconnect (the setting is read per-session). Until app.push_dispatch_url
-- is set, the trigger is a silent no-op — so this migration is safe to apply before
-- the web app that serves /api/push/dispatch has been deployed.

-- ---------------------------------------------------------------
-- 1a. users.fcm_token — the device token the sender pushes to
-- ---------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fcm_token            TEXT,
  ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.users.fcm_token IS
  'Firebase Cloud Messaging device token for this user''s current device. NULL = not registered / signed out / token pruned as unregistered by the sender.';
COMMENT ON COLUMN public.users.fcm_token_updated_at IS
  'When fcm_token was last written. Used to age out stale tokens.';

-- The dispatch audience query is "users with a token", so index only those rows.
CREATE INDEX IF NOT EXISTS idx_users_fcm_token
  ON public.users (id)
  WHERE fcm_token IS NOT NULL;

-- ---------------------------------------------------------------
-- 1b. drivers.status — the availability state machine the apps use
-- ---------------------------------------------------------------
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS status VARCHAR(20);

-- Backfill from the boolean that has been carrying this meaning until now.
UPDATE public.drivers
SET status = CASE WHEN is_available THEN 'available' ELSE 'inactive' END
WHERE status IS NULL;

ALTER TABLE public.drivers
  ALTER COLUMN status SET DEFAULT 'inactive';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_status_check'
  ) THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_status_check
      CHECK (status IN ('available', 'assigned', 'on_trip', 'inactive'));
  END IF;
END $$;

COMMENT ON COLUMN public.drivers.status IS
  'Driver availability state machine: available (online, can be dispatched) | assigned (claimed a request) | on_trip (carrying a patient) | inactive (offline). is_available is the legacy boolean mirror of available/inactive.';

-- Dispatch selects available drivers; index that.
CREATE INDEX IF NOT EXISTS idx_drivers_status
  ON public.drivers (status);

-- ---------------------------------------------------------------
-- 2. SOS → push dispatch webhook
-- ---------------------------------------------------------------

-- pg_net gives us a NON-BLOCKING http_post: it queues the request and returns
-- immediately, so an unreachable push endpoint can never slow down or fail the
-- SOS write itself.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_push_on_sos_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dispatch_url    text := current_setting('app.push_dispatch_url', true);
  dispatch_secret text := current_setting('app.push_dispatch_secret', true);
  prev_status     text := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END;
  prev_driver_id  uuid := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.driver_id END;
BEGIN
  -- Not configured yet → do nothing. Lets this migration land before the sender ships.
  IF dispatch_url IS NULL OR dispatch_url = '' THEN
    RETURN NULL;
  END IF;

  -- `AFTER UPDATE OF status` fires whenever status appears in the UPDATE's SET list,
  -- even if the value is unchanged (e.g. the hospital-only re-selection write, which
  -- rewrites the same status). Only a real transition is a notifiable event.
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NULL;
  END IF;

  -- Deliberately minimal payload: just enough for the receiver to identify the
  -- transition. The receiver re-reads the row with the service role and decides
  -- the event type and audience there, where it is testable in TypeScript.
  PERFORM net.http_post(
    url     := dispatch_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(dispatch_secret, '')
    ),
    body    := jsonb_build_object(
      'request_id',    NEW.id,
      'old_status',    prev_status,
      'new_status',    NEW.status,
      'old_driver_id', prev_driver_id,
      'new_driver_id', NEW.driver_id
    ),
    timeout_milliseconds := 5000
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- A failure to notify must NEVER roll back an emergency write. Warn and move on.
  RAISE WARNING 'notify_push_on_sos_change failed for sos_request %: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.notify_push_on_sos_change() IS
  'AFTER trigger: POSTs an SOS create/status-change to the app''s /api/push/dispatch endpoint via pg_net. Reads app.push_dispatch_url / app.push_dispatch_secret GUCs; no-op when unset. Never raises.';

DROP TRIGGER IF EXISTS trg_notify_push_on_sos_change ON public.sos_requests;
CREATE TRIGGER trg_notify_push_on_sos_change
  AFTER INSERT OR UPDATE OF status ON public.sos_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_sos_change();

-- ---------------------------------------------------------------
-- 3. Dispatch radius config
-- ---------------------------------------------------------------
-- Both the driver home screen and the new push audience query filter incoming SOS
-- requests by this radius. It was only ever a hardcoded 30km fallback in the client
-- (Triqare-app/app/(driver)/index.tsx); seed it so the two agree and an admin can
-- tune it. DO NOTHING preserves any value already set in production.
INSERT INTO public.configurations (key, value) VALUES
    ('driver_sos_request_radius_km', '30')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- END PUSH NOTIFICATIONS PATCH
-- =============================================
