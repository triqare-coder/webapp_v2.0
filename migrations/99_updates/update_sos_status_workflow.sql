-- =============================================
-- Update SOS Status Workflow
-- =============================================
-- This migration updates the SOS request status values to the new workflow:
-- Old: SOS Triggered → Driver Assigned → Driver En Route → Patient Picked Up → At Hospital → Completed → Cancelled
-- New: SOS Triggered → Driver En Route → Transport Arrived → User Picked Up → Arrived at Hospital → Cancelled

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE public.sos_requests 
DROP CONSTRAINT IF EXISTS sos_requests_status_check;

-- Step 2: Update existing data to new status values
UPDATE public.sos_requests 
SET status = 'Driver En Route' 
WHERE status = 'Driver Assigned';

UPDATE public.sos_requests 
SET status = 'Transport Arrived' 
WHERE status = 'Patient Picked Up';

UPDATE public.sos_requests 
SET status = 'User Picked Up' 
WHERE status = 'At Hospital';

UPDATE public.sos_requests 
SET status = 'Arrived at Hospital' 
WHERE status = 'Completed';

-- Step 3: Add new CHECK constraint with updated status values
ALTER TABLE public.sos_requests 
ADD CONSTRAINT sos_requests_status_check 
CHECK (status IN (
    'SOS Triggered',
    'Driver En Route',
    'Transport Arrived',
    'User Picked Up',
    'Arrived at Hospital',
    'Cancelled'
));

-- Step 4: Update default value
ALTER TABLE public.sos_requests 
ALTER COLUMN status SET DEFAULT 'SOS Triggered';

COMMENT ON COLUMN public.sos_requests.status IS 'Current status of the SOS request. Workflow: SOS Triggered → Driver En Route → Transport Arrived → User Picked Up → Arrived at Hospital';

