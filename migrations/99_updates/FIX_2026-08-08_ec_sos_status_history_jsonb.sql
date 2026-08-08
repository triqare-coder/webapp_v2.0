-- =============================================================================
-- EC-RAISED SOS: THE INSERT ITSELF WAS FAILING (status_history text -> jsonb)
-- =============================================================================
--
-- SYMPTOM
--
-- "Raise SOS for this patient" on the emergency-contact screen always ends in
-- the generic "Couldn't raise the SOS / something went wrong" alert, and
-- `select count(*) from sos_requests where triggered_by = 'EMERGENCY_CONTACT'`
-- is ZERO — the path has never once produced a row on live.
--
-- CAUSE
--
-- `create_sos_by_emergency_contact` writes the opening status entry as
--
--     json_build_array(json_build_object(...))::text
--
-- into `sos_requests.status_history`, which on live is **jsonb**, not text (the
-- column was originally specced as TEXT — see sos_requests_inline_columns.sql —
-- but the deployed table has it as jsonb). PostgreSQL has no assignment cast
-- from text to jsonb, so the INSERT raises
--
--     42804: column "status_history" is of type jsonb but expression is of type text
--
-- The client maps any unrecognised SQLSTATE to the 'unknown' failure, which is
-- exactly the alert the contact sees. Nothing is inserted, no ambulance is
-- requested.
--
-- Why it only surfaced now: until the 2026-08-03 patch, patients had no stored
-- coordinates, so the function refused earlier with 22004 ("no known location")
-- and execution never reached this INSERT. Fixing the location fix moved the
-- failure one line further down.
--
-- THE FIX
--
-- Wrap the built array in `to_jsonb(...)`, so a jsonb value is assigned to a
-- jsonb column. The value is deliberately kept as a JSON **string** scalar —
-- i.e. the same shape every patient-created row already has, because the app
-- writes `JSON.stringify([...])` and every reader (mobile mapStatusHistory, the
-- admin dashboard, the status-append path) expects to parse a string. Storing a
-- native jsonb array here instead would make EC-raised rows the odd ones out.
--
-- Also: patient_name now falls back to 'Unknown' rather than NULL, matching the
-- client's own fallback — several live accounts have no first/last name, and a
-- dispatch row with a blank patient name is worse than a placeholder.
--
-- Nothing else in the function changes: authorisation, the live-SOS idempotency
-- check, and the location precedence rules (patient's own position wins;
-- contact-supplied fix only when there is none) are byte-for-byte as shipped in
-- FIX_2026-08-03_ec_sos_contact_location.sql.
--
-- Idempotent: safe to re-run. No client change, no app rebuild — this alone
-- makes the button work.
-- =============================================================================

-- Older 2-arg definition, if any environment still has it: drop so exactly one
-- candidate remains and PostgREST can never answer PGRST203 (ambiguous) to the
-- 2-argument call the app makes when it has no contact-supplied location.
DROP FUNCTION IF EXISTS public.create_sos_by_emergency_contact(uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_sos_by_emergency_contact(
  p_patient_id      uuid,
  p_contact_user_id uuid,
  p_lat             numeric DEFAULT NULL,
  p_lon             numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id      uuid;
  v_email          text;
  v_phone_last10   text;
  v_linked         boolean := false;
  v_patient_name   text;
  v_patient_phone  text;
  v_lat            numeric;
  v_lon            numeric;
  v_location_src   text;
  v_existing       uuid;
  v_new_id         uuid;
BEGIN
  IF p_patient_id IS NULL OR p_contact_user_id IS NULL THEN
    RAISE EXCEPTION 'patient and contact are required' USING ERRCODE = '22023';
  END IF;

  -- Prefer the authenticated caller; fall back to the supplied id.
  BEGIN
    SELECT id INTO v_caller_id FROM public.users WHERE auth_user_id = auth.uid();
  EXCEPTION WHEN others THEN
    v_caller_id := NULL;
  END;
  v_caller_id := COALESCE(v_caller_id, p_contact_user_id);

  SELECT u.email,
         right(regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g'), 10)
    INTO v_email, v_phone_last10
    FROM public.users u
   WHERE u.id = v_caller_id;

  IF v_email IS NULL AND COALESCE(length(v_phone_last10), 0) < 10 THEN
    RAISE EXCEPTION 'not authorised for this patient' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.emergency_contacts ec
     WHERE ec.patient_id = p_patient_id
       AND (
            ec.contact_user_id = v_caller_id
         OR (v_email IS NOT NULL AND ec.email IS NOT NULL
             AND lower(trim(ec.email)) = lower(trim(v_email)))
         OR (length(COALESCE(v_phone_last10, '')) = 10
             AND right(regexp_replace(COALESCE(ec.phone, ''), '\D', '', 'g'), 10)
                 = v_phone_last10)
       )
  ) INTO v_linked;

  IF NOT v_linked THEN
    RAISE EXCEPTION 'not authorised for this patient' USING ERRCODE = '42501';
  END IF;

  -- Never open a second emergency alongside a live one; returning the existing
  -- id makes a double-tap idempotent.
  SELECT id INTO v_existing
    FROM public.sos_requests
   WHERE patient_id = p_patient_id
     AND status NOT IN ('Arrived at Hospital', 'Cancelled', 'Timed Out')
   ORDER BY requested_at DESC
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Location precedence: the patient's own registered position always wins; the
  -- contact's fix is a fallback for the no-location case only.
  SELECT p.latitude, p.longitude
    INTO v_lat, v_lon
    FROM public.patients p
   WHERE p.user_id = p_patient_id;

  IF v_lat IS NOT NULL AND v_lon IS NOT NULL THEN
    v_location_src := 'patient';
  ELSIF p_lat IS NOT NULL AND p_lon IS NOT NULL
        AND p_lat BETWEEN -90 AND 90
        AND p_lon BETWEEN -180 AND 180
        -- (0,0) is Null Island: a zeroed GPS struct, not a place.
        AND NOT (p_lat = 0 AND p_lon = 0) THEN
    v_lat := p_lat;
    v_lon := p_lon;
    v_location_src := 'contact';
  ELSE
    RAISE EXCEPTION 'no known location for this patient' USING ERRCODE = '22004';
  END IF;

  SELECT NULLIF(trim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''),
         u.phone
    INTO v_patient_name, v_patient_phone
    FROM public.users u
   WHERE u.id = p_patient_id;

  INSERT INTO public.sos_requests (
    patient_id, patient_name, patient_phone, status,
    location_lat, location_lon, auto_assigned, requested_at, status_history,
    triggered_by, triggered_by_user_id
  ) VALUES (
    p_patient_id,
    -- Matches the client's own fallback for a nameless account.
    COALESCE(v_patient_name, 'Unknown'),
    v_patient_phone, 'SOS Triggered',
    v_lat, v_lon, true, now(),
    -- to_jsonb(<json text>) => a jsonb STRING scalar, byte-identical in shape to
    -- what the app writes with JSON.stringify(). Assigning the raw ::text here
    -- is what broke this function: there is no text -> jsonb assignment cast.
    to_jsonb(json_build_array(json_build_object(
      'status',    'SOS Triggered',
      'timestamp', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'actor',     'contact',
      'location_source', v_location_src,
      'note',      CASE
                     WHEN v_location_src = 'contact'
                       THEN 'Triggered by emergency contact (pickup location supplied by the contact)'
                     ELSE 'Triggered by emergency contact'
                   END
    ))::text),
    'EMERGENCY_CONTACT', v_caller_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.create_sos_by_emergency_contact(uuid, uuid, numeric, numeric) IS
  'Raise an SOS on behalf of a patient, callable only by one of their linked emergency contacts. Pickup location prefers the patient''s own registered position; p_lat/p_lon are a fallback used ONLY when the patient has none, recorded in status_history.location_source. Returns the new sos_requests.id, or the existing live one if an emergency is already running.';

GRANT EXECUTE ON FUNCTION public.create_sos_by_emergency_contact(uuid, uuid, numeric, numeric)
  TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify (read-only).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Exactly one candidate function, taking four arguments.
SELECT p.oid::regprocedure AS signature,
       pg_get_function_arguments(p.oid) AS arguments
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname = 'create_sos_by_emergency_contact';

-- 2) The column type this fix assumes. Expect jsonb. If it comes back as text,
--    change to_jsonb(...) back to a plain ::text and re-run.
SELECT data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'sos_requests'
   AND column_name = 'status_history';

-- 3) After a contact taps the button, this should stop being empty.
SELECT id, patient_id, status, requested_at, status_history
  FROM public.sos_requests
 WHERE triggered_by = 'EMERGENCY_CONTACT'
 ORDER BY requested_at DESC
 LIMIT 5;

-- =============================================================================
-- END EC SOS status_history CAST FIX
-- =============================================================================
