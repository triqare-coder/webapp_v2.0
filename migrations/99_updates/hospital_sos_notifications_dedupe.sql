-- =====================================================================
-- Hospital dashboard: one notification per event
-- 2026-09-26
--
-- Replaces public.hospital_on_sos_update() from hospital_dashboard.sql
-- (section 5). Nothing else changes: no table, column, policy or trigger
-- definition is touched, and the trigger itself keeps pointing at this
-- function. Idempotent; paste into the Supabase SQL editor.
--
-- Two defects, both seen live on 2026-09-25 (SOS bcd4e198 / 27c9dc85):
--
-- 1. DUPLICATE NOTICES. The destination block ran on EVERY status_history
--    change once a destination existed. The driver's later 'Arrived at
--    Hospital' append re-read the same destination and re-sent "confirmed
--    incoming" / "Stand down" to every hospital. It now runs only when the
--    driver's chosen destination actually CHANGES (first pick, or a mid-trip
--    reselection), and only notifies alerts still in play.
--
-- 2. NO ARRIVAL NOTICE. Admission changed the outcome silently. The admitting
--    hospital now gets "<name> has arrived at your hospital and is marked
--    admitted."
--
-- The status/outcome transitions are unchanged, so the dashboard code deployed
-- in 4f02382 needs no change to go with this.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.hospital_on_sos_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dest jsonb; v_kind text; v_hid uuid; v_label text; r record;
BEGIN
  IF NEW.status_history IS DISTINCT FROM OLD.status_history THEN
    dest := public.hospital_latest_destination(NEW.status_history);

    -- Only a NEW destination is news. Appending any later stage leaves the
    -- latest hospitalDetails identical, and must not re-notify (defect 1).
    IF dest IS NOT NULL
       AND dest IS DISTINCT FROM public.hospital_latest_destination(OLD.status_history) THEN
      v_kind  := NULLIF(dest ->> 'kind', '');
      v_label := NULLIF(dest ->> 'name', '');
      BEGIN
        v_hid := NULLIF(dest ->> 'hospitalId', '')::uuid;
      EXCEPTION WHEN others THEN
        v_hid := NULL;   -- a Google placeId, not a QSoS hospital id
      END;

      IF v_kind = 'nearby' OR (v_hid IS NULL AND v_kind IS DISTINCT FROM 'primary'
                                             AND v_kind IS DISTINCT FROM 'secondary') THEN
        -- Scenario C. Coordination is handled manually by Emergency Response;
        -- the dashboards only need to stand down.
        UPDATE public.hospital_sos_alerts
           SET status = 'CANCELLED',
               cancelled_at = COALESCE(cancelled_at, NOW()),
               destination_label = 'Nearest Hospital (Off-Platform)',
               destination_kind = 'nearby',
               destination_hospital_id = NULL,
               eta_at_confirmation_minutes = NULL,
               eta_minutes = NULL,
               updated_at = NOW()
         WHERE sos_request_id = NEW.id AND outcome = 'PENDING';
      ELSE
        -- Scenario A / B. Match on hospital id when the driver picked a real
        -- QSoS hospital; fall back to the primary/secondary slot otherwise.
        UPDATE public.hospital_sos_alerts
           SET status = 'CONFIRMED_INCOMING',
               confirmed_at = CASE WHEN status = 'CONFIRMED_INCOMING' THEN confirmed_at ELSE NOW() END,
               cancelled_at = NULL,
               destination_label = COALESCE(v_label, destination_label),
               destination_hospital_id = COALESCE(v_hid, hospital_id),
               destination_kind = v_kind,
               updated_at = NOW()
         WHERE sos_request_id = NEW.id
           AND outcome = 'PENDING'
           AND (hospital_id = v_hid
                OR (v_hid IS NULL AND registration_type = UPPER(v_kind)));

        UPDATE public.hospital_sos_alerts
           SET status = 'CANCELLED',
               cancelled_at = CASE WHEN status = 'CANCELLED' THEN cancelled_at ELSE NOW() END,
               confirmed_at = NULL,
               eta_minutes = NULL,
               destination_label = COALESCE(v_label, destination_label),
               destination_hospital_id = v_hid,
               destination_kind = v_kind,
               updated_at = NOW()
         WHERE sos_request_id = NEW.id
           AND outcome = 'PENDING'
           AND status <> 'CONFIRMED_INCOMING';
      END IF;

      -- outcome = 'PENDING': an alert already closed is not told again.
      FOR r IN
        SELECT hospital_id, status, destination_label, patient_name
        FROM public.hospital_sos_alerts
        WHERE sos_request_id = NEW.id AND outcome = 'PENDING'
      LOOP
        INSERT INTO public.hospital_notifications (hospital_id, type, message, sos_request_id, patient_id)
        VALUES (r.hospital_id, 'SOS_STATUS',
                CASE WHEN r.status = 'CONFIRMED_INCOMING'
                     THEN COALESCE(r.patient_name, 'A patient') || ' is confirmed incoming to your hospital.'
                     ELSE COALESCE(r.patient_name, 'A patient') || ' is being taken to ' ||
                          COALESCE(r.destination_label, 'another facility') || '. Stand down.'
                END,
                NEW.id, NEW.patient_id);
      END LOOP;
    END IF;
  END IF;

  -- Terminal outcomes (US-009).
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Arrived at Hospital' THEN
      -- The admitting hospital is told the patient is here (defect 2).
      FOR r IN
        UPDATE public.hospital_sos_alerts
           SET outcome = 'ADMITTED', updated_at = NOW()
         WHERE sos_request_id = NEW.id AND status = 'CONFIRMED_INCOMING' AND outcome = 'PENDING'
        RETURNING hospital_id, patient_name
      LOOP
        INSERT INTO public.hospital_notifications (hospital_id, type, message, sos_request_id, patient_id)
        VALUES (r.hospital_id, 'SOS_STATUS',
                COALESCE(r.patient_name, 'A patient') || ' has arrived at your hospital and is marked admitted.',
                NEW.id, NEW.patient_id);
      END LOOP;
      -- Hospitals already stood down were told then; close them quietly.
      UPDATE public.hospital_sos_alerts
         SET outcome = 'CANCELLED', updated_at = NOW()
       WHERE sos_request_id = NEW.id AND status = 'CANCELLED' AND outcome = 'PENDING';
    ELSIF NEW.status IN ('Cancelled', 'Timed Out') THEN
      -- 'Timed Out' is a no-driver expiry, not a patient cancellation. Both end
      -- the incident for the hospital, so both close the alert as CANCELLED.
      UPDATE public.hospital_sos_alerts
         SET status = 'CANCELLED', outcome = 'CANCELLED',
             cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = NOW()
       WHERE sos_request_id = NEW.id AND outcome = 'PENDING';
    END IF;
  END IF;

  RETURN NEW;
END $$;

COMMIT;

-- Verify: should return 1 row, has_dedupe = true.
SELECT proname,
       prosrc LIKE '%hospital_latest_destination(OLD.status_history)%' AS has_dedupe,
       prosrc LIKE '%has arrived at your hospital%'                    AS has_arrival_notice
FROM pg_proc
WHERE proname = 'hospital_on_sos_update' AND pronamespace = 'public'::regnamespace;
