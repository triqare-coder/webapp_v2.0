-- =====================================================================
-- QSoS Hospital Dashboard (US-001 … US-009)
-- 2026-08-25
--
-- Idempotent. Safe to re-run. Paste into the Supabase SQL editor:
-- this project exposes no exec_sql/exec RPC (verified live), so there is
-- no self-applying path.
--
-- Written against the LIVE schema as measured by
-- scripts/_hospital-preflight.js on 2026-08-25, NOT against
-- migrations/01_schema/02_tables.sql, which is drifted. Measured facts
-- this file depends on:
--   * sos_requests has NO created_at, NO destination_hospital_id,
--     NO estimated_arrival_time, NO assigned_driver_id.
--     The SOS timestamp is requested_at; the driver link is driver_id.
--   * sos_requests.status_history is jsonb holding a JSON *string scalar*
--     that contains the array (every sampled row). Parsed defensively below.
--   * public.current_app_user_id() does not exist (Auth Phase 1 unapplied).
--   * anon can still SELECT users/patients/sos_requests/hospitals.
--     Every table created here is therefore RLS-ON with no anon grant.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Extend existing tables
-- ---------------------------------------------------------------------

-- 1a. users.role gains 'hospital'. The constraint name is looked up rather
--     than assumed, because this DB has been reshaped by hand repeatedly.
DO $$
DECLARE cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public' AND rel.relname = 'users'
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin','ert','transport_company','patient','driver','hospital'));
END $$;

-- 1b. hospitals: QSoS-programme fields.
--     qsos_eligibility is a NEW axis. It is deliberately not layered onto the
--     existing hospital_type column, which means government/private/teaching/
--     specialty/clinic and answers a different question entirely.
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS specialisations TEXT[];
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS qsos_eligibility TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS qsos_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.hospitals DROP CONSTRAINT IF EXISTS hospitals_qsos_eligibility_check;
  ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_qsos_eligibility_check
    CHECK (qsos_eligibility IS NULL OR qsos_eligibility IN ('PRIMARY','SECONDARY','BOTH'));
END $$;

CREATE INDEX IF NOT EXISTS idx_hospitals_qsos_enabled ON public.hospitals(qsos_enabled) WHERE qsos_enabled;

-- 1c. patients: the US-003 profile fields nothing captures yet.
--     Added now so the dashboard renders every spec'd section with a
--     "Not provided" fallback, and mobile capture can land later without
--     a second migration. `allergies` stays as the existing general field.
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS known_conditions TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medication_allergies TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS environmental_allergies TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS mobility_flags TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS organ_donor BOOLEAN;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_policy_type TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_valid_from DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_coverage_summary TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurer_emergency_phone TEXT;

-- Every "patients registered with me as secondary" query would otherwise seq-scan.
CREATE INDEX IF NOT EXISTS idx_patients_secondary_hospital_id
  ON public.patients(secondary_hospital_id) WHERE secondary_hospital_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. New tables
--
-- Retention rule, applied throughout: a hospital's record of a patient must
-- outlive the patient's account. Account deletion is a hard DELETE on
-- public.users which cascades users -> patients -> sos_requests. So nothing
-- here uses ON DELETE CASCADE to patient data, and every row carries the
-- snapshot it needs to stay readable on its own.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hospital_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_hospital_admins_hospital ON public.hospital_admins(hospital_id);
COMMENT ON TABLE public.hospital_admins IS
  'Hospital Admin <-> hospital. user_id -> public.users.id, which reaches Supabase Auth via users.auth_user_id (this platform has no Clerk).';

-- Onboarding token (US-001). Only the sha256 hash is stored: a leaked table
-- dump must not yield working 72-hour login links.
CREATE TABLE IF NOT EXISTS public.hospital_onboarding_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospital_onboarding_tokens_hospital
  ON public.hospital_onboarding_tokens(hospital_id);

-- US-003/004/005. Mirrors patients.primary_hospital_id / secondary_hospital_id,
-- which are live pointers with no history. This table is what gives a hospital
-- "registered since", an ACTIVE/INACTIVE lifecycle, and retention.
CREATE TABLE IF NOT EXISTS public.hospital_patient_registrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('PRIMARY','SECONDARY')),
  registered_since  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  archived_at       TIMESTAMPTZ,
  patient_name      TEXT,
  patient_phone     TEXT,
  blood_group       TEXT,
  known_conditions  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One live registration per (hospital, patient, type). Archived rows are exempt
-- so a patient may leave and return without colliding with their own history.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hospital_registration_live
  ON public.hospital_patient_registrations(hospital_id, patient_id, registration_type)
  WHERE archived_at IS NULL AND patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hospital_reg_hospital_status
  ON public.hospital_patient_registrations(hospital_id, status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hospital_reg_patient
  ON public.hospital_patient_registrations(patient_id);

-- US-006/007/008/009. ONE ROW PER (sos_request, hospital).
-- The spec models per-hospital status on a single sos_events row; that shape
-- cannot be RLS-scoped to one hospital, because a row would belong to two.
-- Splitting it makes isolation, the beacon feed and admission history fall out.
CREATE TABLE IF NOT EXISTS public.hospital_sos_alerts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deliberately NOT a foreign key, mirroring push_deliveries.request_id:
  -- deleting a patient account cascades sos_requests away, and this row is the
  -- hospital's permanent admission record (US-009: never deleted).
  sos_request_id             UUID NOT NULL,
  hospital_id                UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id                 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  registration_type          TEXT NOT NULL CHECK (registration_type IN ('PRIMARY','SECONDARY')),
  status                     TEXT NOT NULL DEFAULT 'PENDING'
                               CHECK (status IN ('PENDING','CONFIRMED_INCOMING','CANCELLED')),
  outcome                    TEXT NOT NULL DEFAULT 'PENDING'
                               CHECK (outcome IN ('PENDING','ADMITTED','CANCELLED')),
  triggered_at               TIMESTAMPTZ NOT NULL,
  confirmed_at               TIMESTAMPTZ,
  cancelled_at               TIMESTAMPTZ,
  destination_label          TEXT,
  destination_hospital_id    UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  destination_kind           TEXT CHECK (destination_kind IN ('primary','secondary','nearby')),
  eta_at_confirmation_minutes INTEGER,
  eta_minutes                INTEGER,
  eta_updated_at             TIMESTAMPTZ,
  -- Snapshots: US-009 AC4 requires these to survive the patient leaving or
  -- deleting their account.
  patient_name               TEXT,
  blood_group                TEXT,
  known_conditions           TEXT,
  allergies                  TEXT,
  -- OQ-002: bed 'Prepared' is NOT built in v1. The column exists so it can be
  -- turned on without a migration, per the open question's own instruction.
  bed_prepared_at            TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sos_request_id, hospital_id)
);
CREATE INDEX IF NOT EXISTS idx_hospital_sos_alerts_hospital_triggered
  ON public.hospital_sos_alerts(hospital_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_sos_alerts_live
  ON public.hospital_sos_alerts(hospital_id) WHERE status IN ('PENDING','CONFIRMED_INCOMING');
CREATE INDEX IF NOT EXISTS idx_hospital_sos_alerts_request
  ON public.hospital_sos_alerts(sos_request_id);

-- Notification centre (6.11). Hospital-scoped, not user-scoped: a notice
-- belongs to the hospital, so every admin of it sees the same feed. The
-- existing public.notifications is user_id-scoped and is currently
-- anon-readable with RLS disabled, so it is not reused here.
CREATE TABLE IF NOT EXISTS public.hospital_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id    UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN
                   ('REGISTRATION','PREFERENCE_CHANGE','ACCOUNT_DELETED','SOS','SOS_STATUS','SYSTEM')),
  message        TEXT NOT NULL,
  sos_request_id UUID,
  patient_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospital_notifications_feed
  ON public.hospital_notifications(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_notifications_unread
  ON public.hospital_notifications(hospital_id) WHERE read_at IS NULL;

-- DPDPA 2023: an audit log of dashboard data accesses.
CREATE TABLE IF NOT EXISTS public.hospital_audit_log (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_admin_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  hospital_id            UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  action                 TEXT NOT NULL,
  patient_id             UUID,
  sos_request_id         UUID,
  accessed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospital_audit_hospital
  ON public.hospital_audit_log(hospital_id, accessed_at DESC);

COMMIT;

-- =====================================================================
-- 3. status_history parsing
--
-- The driver's chosen destination is the ONLY record of where an ambulance is
-- going: sos_requests.destination_hospital_id does not exist on this database.
-- The mobile app writes the choice into status_history as
--   { status, timestamp, actor, hospitalDetails: { hospitalId?, placeId?, name,
--     address?, latitude, longitude, kind: 'primary'|'secondary'|'nearby' } }
-- and the driver writes it straight to Supabase, so a trigger is the only
-- thing that can observe it. Hence all of section 5.
-- =====================================================================

BEGIN;

-- status_history is jsonb, but it holds a JSON *string scalar* containing the
-- array (see FIX_2026-08-08_ec_sos_status_history_jsonb.sql, and confirmed on
-- every row sampled live). Both shapes are accepted; anything unparseable
-- degrades to an empty array rather than aborting the driver's status write.
CREATE OR REPLACE FUNCTION public.hospital_status_history_array(sh jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF sh IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF jsonb_typeof(sh) = 'array'  THEN RETURN sh; END IF;
  IF jsonb_typeof(sh) = 'string' THEN RETURN (sh #>> '{}')::jsonb; END IF;
  RETURN '[]'::jsonb;
EXCEPTION WHEN others THEN
  RETURN '[]'::jsonb;
END $$;

-- The newest entry carrying hospitalDetails. The driver may reselect a
-- hospital mid-trip, which re-issues 'User Picked Up', so the LAST one wins.
CREATE OR REPLACE FUNCTION public.hospital_latest_destination(sh jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT t.e -> 'hospitalDetails'
  FROM jsonb_array_elements(public.hospital_status_history_array(sh))
       WITH ORDINALITY AS t(e, ord)
  WHERE jsonb_typeof(t.e) = 'object'
    AND jsonb_typeof(t.e -> 'hospitalDetails') = 'object'
  ORDER BY t.ord DESC
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- 4. Registration lifecycle (US-003 / US-004 / US-005)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.hospital_join(
  p_hospital_id uuid, p_patient_id uuid, p_type text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_phone text; v_blood text; v_cond text;
BEGIN
  IF p_hospital_id IS NULL OR p_patient_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(TRIM(u.full_name), ''),
                  NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
                  u.email),
         u.phone, p.blood_group, p.known_conditions
    INTO v_name, v_phone, v_blood, v_cond
  FROM public.users u
  LEFT JOIN public.patients p ON p.user_id = u.id
  WHERE u.id = p_patient_id;

  -- US-005 AC3: a returning patient's previous INACTIVE record is archived.
  -- The old row's patient_id was nulled by the account delete, so the person is
  -- re-identified by phone last-10 -- the same matching rule the platform
  -- already uses for emergency contacts (current_app_user_phone_last10).
  IF v_phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(v_phone, '\D', '', 'g')) >= 10 THEN
    UPDATE public.hospital_patient_registrations
       SET archived_at = NOW(), updated_at = NOW()
     WHERE hospital_id = p_hospital_id
       AND registration_type = p_type
       AND status = 'INACTIVE'
       AND archived_at IS NULL
       AND patient_id IS DISTINCT FROM p_patient_id
       AND RIGHT(REGEXP_REPLACE(COALESCE(patient_phone, ''), '\D', '', 'g'), 10)
           = RIGHT(REGEXP_REPLACE(v_phone, '\D', '', 'g'), 10);
  END IF;

  INSERT INTO public.hospital_patient_registrations
    (hospital_id, patient_id, registration_type, patient_name, patient_phone, blood_group, known_conditions)
  VALUES (p_hospital_id, p_patient_id, p_type, v_name, v_phone, v_blood, v_cond)
  ON CONFLICT (hospital_id, patient_id, registration_type)
    WHERE archived_at IS NULL AND patient_id IS NOT NULL
  DO UPDATE SET status = 'ACTIVE',
                patient_name = EXCLUDED.patient_name,
                patient_phone = EXCLUDED.patient_phone,
                blood_group = EXCLUDED.blood_group,
                known_conditions = EXCLUDED.known_conditions,
                updated_at = NOW();

  INSERT INTO public.hospital_notifications (hospital_id, type, message, patient_id)
  VALUES (p_hospital_id, 'REGISTRATION',
          COALESCE(v_name, 'A patient') || ' has registered with you as a ' || LOWER(p_type) || ' emergency hospital.',
          p_patient_id);
END $$;

-- US-004: preference change is the ONLY way a patient leaves a hospital list.
-- The row is ARCHIVED (removed from the list entirely), never marked INACTIVE --
-- INACTIVE is reserved for account deletion, which stays visible under the toggle.
CREATE OR REPLACE FUNCTION public.hospital_leave(
  p_hospital_id uuid, p_patient_id uuid, p_type text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF p_hospital_id IS NULL OR p_patient_id IS NULL THEN RETURN; END IF;

  UPDATE public.hospital_patient_registrations
     SET archived_at = NOW(), updated_at = NOW()
   WHERE hospital_id = p_hospital_id
     AND patient_id = p_patient_id
     AND registration_type = p_type
     AND archived_at IS NULL
  RETURNING patient_name INTO v_name;

  IF FOUND THEN
    INSERT INTO public.hospital_notifications (hospital_id, type, message, patient_id)
    VALUES (p_hospital_id, 'PREFERENCE_CHANGE',
            COALESCE(v_name, 'A patient') ||
            ' has updated their hospital preference and is no longer registered with you.',
            p_patient_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hospital_on_patient_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.hospital_join(NEW.primary_hospital_id,   NEW.user_id, 'PRIMARY');
    PERFORM public.hospital_join(NEW.secondary_hospital_id, NEW.user_id, 'SECONDARY');
    RETURN NEW;
  END IF;

  IF NEW.primary_hospital_id IS DISTINCT FROM OLD.primary_hospital_id THEN
    PERFORM public.hospital_leave(OLD.primary_hospital_id, NEW.user_id, 'PRIMARY');
    PERFORM public.hospital_join (NEW.primary_hospital_id, NEW.user_id, 'PRIMARY');
  END IF;

  IF NEW.secondary_hospital_id IS DISTINCT FROM OLD.secondary_hospital_id THEN
    PERFORM public.hospital_leave(OLD.secondary_hospital_id, NEW.user_id, 'SECONDARY');
    PERFORM public.hospital_join (NEW.secondary_hospital_id, NEW.user_id, 'SECONDARY');
  END IF;

  -- Keep the snapshot fresh while the patient still exists, so the frozen copy
  -- is current at the moment it has to stand alone.
  IF NEW.blood_group IS DISTINCT FROM OLD.blood_group
     OR NEW.known_conditions IS DISTINCT FROM OLD.known_conditions THEN
    UPDATE public.hospital_patient_registrations
       SET blood_group = NEW.blood_group, known_conditions = NEW.known_conditions, updated_at = NOW()
     WHERE patient_id = NEW.user_id AND archived_at IS NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hospital_on_patient_change ON public.patients;
CREATE TRIGGER trg_hospital_on_patient_change
  AFTER INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.hospital_on_patient_change();

-- US-005. Account deletion is a hard DELETE on users that cascades
-- users -> patients -> sos_requests. BEFORE DELETE runs while the patient row
-- is still readable, which is the only moment the snapshot can be taken.
CREATE OR REPLACE FUNCTION public.hospital_on_user_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; r record;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(OLD.full_name), ''),
                  NULLIF(TRIM(CONCAT_WS(' ', OLD.first_name, OLD.last_name)), ''),
                  OLD.email)
    INTO v_name;

  -- Status only. NOT archived: an INACTIVE patient must stay reachable through
  -- the dashboard's Inactive toggle (US-005 AC2).
  FOR r IN
    UPDATE public.hospital_patient_registrations
       SET status = 'INACTIVE',
           patient_name = COALESCE(patient_name, v_name),
           updated_at = NOW()
     WHERE patient_id = OLD.id AND archived_at IS NULL
    RETURNING hospital_id
  LOOP
    INSERT INTO public.hospital_notifications (hospital_id, type, message, patient_id)
    VALUES (r.hospital_id, 'ACCOUNT_DELETED',
            COALESCE(v_name, 'A patient') || '''s QSoS account has been deleted. Their profile is now inactive.',
            OLD.id);
  END LOOP;

  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_hospital_on_user_delete ON public.users;
CREATE TRIGGER trg_hospital_on_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.hospital_on_user_delete();

COMMIT;

-- =====================================================================
-- 5. SOS lifecycle (US-006 / US-007 / US-009)
-- =====================================================================

BEGIN;

-- US-006: a patient taps SOS -> alert BOTH the primary and the secondary
-- hospital at once, both PENDING, because the destination is not yet known and
-- unnecessary preparation is cheaper than late preparation.
CREATE OR REPLACE FUNCTION public.hospital_on_sos_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_allergies text;
BEGIN
  SELECT allergies INTO v_allergies FROM public.patients WHERE user_id = NEW.patient_id;

  -- status = 'ACTIVE' is what stops a deleted account from paging a hospital
  -- (US-005), and archived_at IS NULL is what stops a hospital the patient has
  -- left from being paged (US-004).
  FOR r IN
    SELECT hospital_id, registration_type, patient_name, blood_group, known_conditions
    FROM public.hospital_patient_registrations
    WHERE patient_id = NEW.patient_id AND status = 'ACTIVE' AND archived_at IS NULL
  LOOP
    INSERT INTO public.hospital_sos_alerts
      (sos_request_id, hospital_id, patient_id, registration_type, triggered_at,
       patient_name, blood_group, known_conditions, allergies)
    VALUES
      (NEW.id, r.hospital_id, NEW.patient_id, r.registration_type,
       -- sos_requests has NO created_at on this database; requested_at is the
       -- SOS trigger timestamp (US-009 "Date & Time").
       COALESCE(NEW.requested_at, NOW()),
       COALESCE(r.patient_name, NEW.patient_name), r.blood_group, r.known_conditions, v_allergies)
    ON CONFLICT (sos_request_id, hospital_id) DO NOTHING;

    INSERT INTO public.hospital_notifications (hospital_id, type, message, sos_request_id, patient_id)
    VALUES (r.hospital_id, 'SOS',
            'SOS: ' || COALESCE(r.patient_name, NEW.patient_name, 'A patient') ||
            ' (' || LOWER(r.registration_type) || ') has triggered an emergency. Status: PENDING.',
            NEW.id, NEW.patient_id);
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hospital_on_sos_insert ON public.sos_requests;
CREATE TRIGGER trg_hospital_on_sos_insert
  AFTER INSERT ON public.sos_requests
  FOR EACH ROW EXECUTE FUNCTION public.hospital_on_sos_insert();

-- US-007: the driver picks a destination after the patient is on board.
-- Scenario A (primary) / B (secondary): that hospital -> CONFIRMED INCOMING,
-- the other -> CANCELLED. Scenario C (nearby, an off-platform facility):
-- BOTH -> CANCELLED, no CONFIRMED INCOMING anywhere, ETA left blank.
CREATE OR REPLACE FUNCTION public.hospital_on_sos_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dest jsonb; v_kind text; v_hid uuid; v_label text; r record;
BEGIN
  IF NEW.status_history IS DISTINCT FROM OLD.status_history THEN
    dest := public.hospital_latest_destination(NEW.status_history);

    IF dest IS NOT NULL THEN
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

      FOR r IN
        SELECT hospital_id, status, destination_label, patient_name
        FROM public.hospital_sos_alerts
        WHERE sos_request_id = NEW.id
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
      UPDATE public.hospital_sos_alerts
         SET outcome = 'ADMITTED', updated_at = NOW()
       WHERE sos_request_id = NEW.id AND status = 'CONFIRMED_INCOMING';
      UPDATE public.hospital_sos_alerts
         SET outcome = 'CANCELLED', updated_at = NOW()
       WHERE sos_request_id = NEW.id AND status = 'CANCELLED';
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

DROP TRIGGER IF EXISTS trg_hospital_on_sos_update ON public.sos_requests;
CREATE TRIGGER trg_hospital_on_sos_update
  AFTER UPDATE ON public.sos_requests
  FOR EACH ROW EXECUTE FUNCTION public.hospital_on_sos_update();

COMMIT;

-- =====================================================================
-- 6. Isolation: RLS + grants
--
-- The NFR is that a Hospital Admin can never read another hospital's rows and
-- that this is architecturally prevented, not merely unrendered. On this
-- database anon can still SELECT users/patients/sos_requests/hospitals (the
-- 2026-07-29 rollback left RLS off on the core tables), so these six new
-- tables are locked down independently and grant anon nothing at all.
--
-- Scope note: this file deliberately does NOT touch RLS on any pre-existing
-- table. That cutover still has ~75 open anon-key call sites and its own
-- outage history; entangling it with this feature would repeat 2026-07-29.
-- =====================================================================

BEGIN;

-- Auth Phase 1 was never applied live, so this helper does not exist. Creating
-- the function alone changes no table's RLS and cannot cause a deny-all.
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_hospital_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(ARRAY_AGG(ha.hospital_id), '{}')
  FROM public.hospital_admins ha
  WHERE ha.user_id = public.current_app_user_id();
$$;

GRANT EXECUTE ON FUNCTION public.current_app_user_id()  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_hospital_ids() TO authenticated, service_role;

ALTER TABLE public.hospital_admins                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_onboarding_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_patient_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_sos_alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_audit_log              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sb_hospital: admins select own"        ON public.hospital_admins;
DROP POLICY IF EXISTS "sb_hospital: registrations select own" ON public.hospital_patient_registrations;
DROP POLICY IF EXISTS "sb_hospital: alerts select own"        ON public.hospital_sos_alerts;
DROP POLICY IF EXISTS "sb_hospital: notifications select own" ON public.hospital_notifications;

CREATE POLICY "sb_hospital: admins select own" ON public.hospital_admins
  FOR SELECT TO authenticated USING (user_id = public.current_app_user_id());

CREATE POLICY "sb_hospital: registrations select own" ON public.hospital_patient_registrations
  FOR SELECT TO authenticated USING (hospital_id = ANY (public.current_hospital_ids()));

CREATE POLICY "sb_hospital: alerts select own" ON public.hospital_sos_alerts
  FOR SELECT TO authenticated USING (hospital_id = ANY (public.current_hospital_ids()));

CREATE POLICY "sb_hospital: notifications select own" ON public.hospital_notifications
  FOR SELECT TO authenticated USING (hospital_id = ANY (public.current_hospital_ids()));

-- Read-only for clients. Every write goes through an API route holding the
-- service-role key, after requireHospital() has proved the caller owns the row.
REVOKE ALL ON public.hospital_admins,
              public.hospital_onboarding_tokens,
              public.hospital_patient_registrations,
              public.hospital_sos_alerts,
              public.hospital_notifications,
              public.hospital_audit_log
  FROM anon, authenticated;

GRANT SELECT ON public.hospital_admins,
                public.hospital_patient_registrations,
                public.hospital_sos_alerts,
                public.hospital_notifications
  TO authenticated;

-- hospital_onboarding_tokens and hospital_audit_log stay service-role only:
-- RLS on with no policy and no grant. Same defence-in-depth shape as
-- device_tokens and push_deliveries. A login token must never be client-readable,
-- and an audit trail must not be readable by its own subject.

COMMIT;

-- =====================================================================
-- 7. Realtime
--
-- No migration in this repo has ever touched the publication -- realtime has
-- been enabled by hand in the dashboard, which is why it silently does nothing
-- for new tables. Declared explicitly here.
-- =====================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hospital_sos_alerts','hospital_patient_registrations','hospital_notifications']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Realtime delivers the full row to subscribers, so REPLICA IDENTITY FULL is
-- needed for UPDATE payloads to carry the previous values the UI diffs against.
ALTER TABLE public.hospital_sos_alerts            REPLICA IDENTITY FULL;
ALTER TABLE public.hospital_patient_registrations REPLICA IDENTITY FULL;
ALTER TABLE public.hospital_notifications         REPLICA IDENTITY FULL;

-- =====================================================================
-- 8. Configuration (the spec's open questions, surfaced not hardcoded)
-- =====================================================================

INSERT INTO public.configurations (key, value) VALUES
  ('hospital_onboarding_token_hours',     '72'),
  -- OQ-004: auto-fire the onboarding email on save. The manual
  -- "Send Onboarding Email" action stays wired either way.
  ('hospital_onboarding_email_autofire',  'true'),
  -- OQ-001: driver loses connectivity and cannot confirm a destination.
  -- REMAIN_PENDING keeps both hospitals prepared; TIMEOUT_TO_PRIMARY is the
  -- alternative. Default is to stay PENDING until connectivity returns.
  ('hospital_sos_driver_offline_policy',  'REMAIN_PENDING'),
  ('hospital_eta_refresh_seconds',        '60')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 9. Backfill
--
-- 204 hospitals and ~72 live patient preferences already exist. Without this,
-- every hospital's dashboard would open empty and only populate for patients
-- who happen to edit their preferences after go-live.
-- =====================================================================

INSERT INTO public.hospital_patient_registrations
  (hospital_id, patient_id, registration_type, registered_since,
   patient_name, patient_phone, blood_group, known_conditions)
SELECT h.hospital_id, h.user_id, h.registration_type, COALESCE(p.created_at, NOW()),
       COALESCE(NULLIF(TRIM(u.full_name), ''),
                NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
                u.email),
       u.phone, p.blood_group, p.known_conditions
FROM (
  SELECT user_id, primary_hospital_id   AS hospital_id, 'PRIMARY'::text   AS registration_type
    FROM public.patients WHERE primary_hospital_id IS NOT NULL
  UNION ALL
  SELECT user_id, secondary_hospital_id AS hospital_id, 'SECONDARY'::text AS registration_type
    FROM public.patients WHERE secondary_hospital_id IS NOT NULL
) h
JOIN public.patients p ON p.user_id = h.user_id
JOIN public.users    u ON u.id      = h.user_id
ON CONFLICT (hospital_id, patient_id, registration_type)
  WHERE archived_at IS NULL AND patient_id IS NOT NULL
DO NOTHING;

-- =====================================================================
-- 10. Verify
-- =====================================================================

SELECT 'tables' AS check, COUNT(*)::text AS value FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'hospital\_%'
UNION ALL
SELECT 'rls enabled', COUNT(*)::text FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'hospital\_%' AND rowsecurity
UNION ALL
SELECT 'policies', COUNT(*)::text FROM pg_policies
  WHERE schemaname = 'public' AND policyname LIKE 'sb_hospital:%'
UNION ALL
SELECT 'realtime tables', COUNT(*)::text FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND tablename LIKE 'hospital\_%'
UNION ALL
SELECT 'backfilled registrations', COUNT(*)::text FROM public.hospital_patient_registrations
UNION ALL
SELECT 'config keys', COUNT(*)::text FROM public.configurations WHERE key LIKE 'hospital\_%';
