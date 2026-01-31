-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- Additional constraints not defined in table creation
-- =============================================

-- =============================================
-- DRIVERS TABLE - Current Request Constraint
-- =============================================
-- This constraint is added after sos_requests table is created

ALTER TABLE public.drivers 
DROP CONSTRAINT IF EXISTS fk_drivers_current_request;

ALTER TABLE public.drivers 
ADD CONSTRAINT fk_drivers_current_request 
FOREIGN KEY (current_request_id) REFERENCES public.sos_requests(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_drivers_current_request ON public.drivers IS 'Links driver to their current active SOS request';

-- =============================================
-- END OF CONSTRAINT DEFINITIONS
-- =============================================

