-- =============================================
-- SOS REQUESTS — INLINE OPERATIONAL COLUMNS (schema-drift reconciliation)
-- Incremental patch to the live sos_requests table.
-- Apply like the other 99_updates patches.
-- =============================================
--
-- The live app reads and writes a set of columns on sos_requests that were never
-- captured in any migration (schema drift). 01_schema/02_tables.sql defines the
-- documented model (latitude/longitude, pickup_address, assigned_driver_id, etc.),
-- but the running code uses the canonical "inline driver" model:
--
--   src/app/api/sos-requests/route.ts          (select + insert)
--   src/app/api/sos-requests/[id]/route.ts     (select + update)
--   src/services/sosRequestService.ts          (DatabaseSOSRequest interface)
--
-- selecting/writing: requested_at, assigned_at, completed_at, auto_assigned,
-- location_lat, location_lon, patient_name, patient_phone, driver_id, driver_name,
-- driver_phone, status_history. None of these exist in the committed migrations,
-- so a database rebuilt from deploy.sql would 500 on every SOS list/assign/
-- transport/ER-team endpoint (column does not exist).
--
-- This patch ALTERs the table to add those columns so the migration set can rebuild
-- the schema the app actually runs against. Types mirror the DatabaseSOSRequest
-- interface in src/services/sosRequestService.ts:
--   * status_history is a JSON string stored as TEXT (initStatusHistory /
--     appendStatusHistory in src/lib/sosStatus.ts return JSON.stringify(...)).
--   * driver_id is the denormalized inline driver user id; the FK-constrained
--     assigned_driver_id column already exists for referential integrity, so
--     driver_id is left unconstrained to match the app's write path.
--   * requested_at backfills from created_at for any legacy rows.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.sos_requests
  ADD COLUMN IF NOT EXISTS requested_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS assigned_at     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_assigned   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_lat    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lon    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS patient_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS patient_phone   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS driver_id       UUID,
  ADD COLUMN IF NOT EXISTS driver_name     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS driver_phone    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS status_history  TEXT;

-- Backfill requested_at for any pre-existing rows that predate this column.
UPDATE public.sos_requests
SET requested_at = created_at
WHERE requested_at IS NULL;

-- Index the inline driver column used by the available-drivers / dashboard queries.
CREATE INDEX IF NOT EXISTS idx_sos_requests_driver_id
  ON public.sos_requests (driver_id);

-- =============================================
-- DRIVER-SCOPED SOS_REQUESTS RLS (completes the write-policy gap)
-- =============================================
-- The patient-owner SELECT/INSERT/UPDATE policies live in
-- 02_security/01_rls_policies.sql, but the assigned DRIVER must also be able to read
-- the request they were dispatched to and advance its state machine
-- (Driver En Route -> Transport Arrived -> ... -> Arrived at Hospital). That policy
-- is defined HERE rather than in 01_rls_policies.sql because it references the inline
-- driver_id column, which is created by this very patch and does not exist at the
-- point 01_rls_policies.sql runs in deploy.sql. It uses the same clerk-join ownership
-- pattern (sos_requests.driver_id == drivers.user_id == users.id) so the assigned
-- driver — and only the assigned driver — can read/update the row. No anon grant
-- exists for sos_requests (02_grants.sql), so this strictly improves on the prior
-- write deny-all without exposing anything to anonymous callers.

-- Assigned driver can view the SOS request they are dispatched to
DROP POLICY IF EXISTS "Assigned driver can view SOS request" ON public.sos_requests;
CREATE POLICY "Assigned driver can view SOS request" ON public.sos_requests
    FOR SELECT
    USING (
        sos_requests.driver_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = sos_requests.driver_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

-- Drivers can claim an unassigned request and the assigned driver can advance it.
-- USING admits two row states: (a) a still-unassigned request (driver_id IS NULL),
-- which any authenticated driver may CLAIM, and (b) a request already assigned to the
-- requesting driver, which they may ADVANCE through the workflow. WITH CHECK requires
-- the resulting row's driver_id to belong to the requesting driver, so a driver can
-- only set/keep themselves as the assignee — they cannot reassign a request to, or
-- steal one already owned by, another driver. (Server-side service_role dispatch
-- bypasses RLS and is unaffected.)
DROP POLICY IF EXISTS "Assigned driver can update SOS request" ON public.sos_requests;
CREATE POLICY "Assigned driver can update SOS request" ON public.sos_requests
    FOR UPDATE
    USING (
        sos_requests.driver_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = sos_requests.driver_id
            AND users.clerk_user_id = auth.uid()::text
        )
    )
    WITH CHECK (
        sos_requests.driver_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = sos_requests.driver_id
            AND users.clerk_user_id = auth.uid()::text
        )
    );

COMMENT ON COLUMN public.sos_requests.requested_at   IS 'When the SOS was created (inline model); backfilled from created_at for legacy rows.';
COMMENT ON COLUMN public.sos_requests.assigned_at    IS 'When a driver was assigned to this request.';
COMMENT ON COLUMN public.sos_requests.completed_at   IS 'When the request reached a terminal state.';
COMMENT ON COLUMN public.sos_requests.auto_assigned  IS 'True when the driver was auto-assigned by dispatch.';
COMMENT ON COLUMN public.sos_requests.location_lat   IS 'Pickup latitude (inline model).';
COMMENT ON COLUMN public.sos_requests.location_lon   IS 'Pickup longitude (inline model).';
COMMENT ON COLUMN public.sos_requests.patient_name   IS 'Denormalized patient name for fast dashboard/search.';
COMMENT ON COLUMN public.sos_requests.patient_phone  IS 'Denormalized patient phone for fast dashboard/search.';
COMMENT ON COLUMN public.sos_requests.driver_id      IS 'Denormalized inline driver user id; assigned_driver_id carries the FK.';
COMMENT ON COLUMN public.sos_requests.driver_name    IS 'Denormalized assigned driver name.';
COMMENT ON COLUMN public.sos_requests.driver_phone   IS 'Denormalized assigned driver phone.';
COMMENT ON COLUMN public.sos_requests.status_history IS 'JSON string array of {status,timestamp} entries (see src/lib/sosStatus.ts).';
