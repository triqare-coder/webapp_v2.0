-- =============================================
-- TRANSPORT DASHBOARD ENHANCEMENT (US-T01..US-T04)
-- Incremental patch to live tables. Apply like update_sos_status_workflow.sql.
-- =============================================
--
-- Adds the data needed to distinguish SOS "Cancelled" (driver actively declined)
-- from "Rejected" (offer timed out), to chain reassignments, and indexes for
-- fast per-driver trip / SOS-log queries.
--
-- NOTE: the assignment log (sos_request_assigned) is currently bypassed by the
-- live dispatch flow. The transport dashboard reads from it; rejection/timeout
-- ROWS will only appear once the dispatch/assignment write-path starts inserting
-- into sos_request_assigned (a separate backend task — see US-T04 follow-up).

-- 1. Distinguish declined vs timed-out on the assignment log
ALTER TABLE public.sos_request_assigned
  ADD COLUMN IF NOT EXISTS rejection_type VARCHAR(20)
    CHECK (rejection_type IN ('declined', 'timed_out'));

COMMENT ON COLUMN public.sos_request_assigned.rejection_type IS
  'declined = driver actively declined (shows as "Cancelled"); timed_out = offer expired with no response (shows as "Rejected")';

-- 2. Reassignment chain — link an assignment to the one it superseded
ALTER TABLE public.sos_request_assigned
  ADD COLUMN IF NOT EXISTS previous_assignment_id UUID
    REFERENCES public.sos_request_assigned(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sos_request_assigned.previous_assignment_id IS
  'Prior assignment this one superseded, when an SOS request was reassigned to another driver';

-- 3. Performance indexes for per-driver dashboard queries
CREATE INDEX IF NOT EXISTS idx_sos_requests_assigned_driver_status
  ON public.sos_requests (assigned_driver_id, status);

CREATE INDEX IF NOT EXISTS idx_sos_request_assigned_driver_status
  ON public.sos_request_assigned (driver_id, status);

CREATE INDEX IF NOT EXISTS idx_sos_request_assigned_driver_created
  ON public.sos_request_assigned (driver_id, created_at);

-- service_role already has table privileges; nothing else to grant.
