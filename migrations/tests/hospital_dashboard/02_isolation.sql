\set ON_ERROR_STOP on
\pset pager off
-- Two hospitals, one admin each, one patient registered at each.
INSERT INTO hospitals (id,name) VALUES
  ('44444444-4444-4444-4444-444444444444','Hospital A'),
  ('55555555-5555-5555-5555-555555555555','Hospital B');
INSERT INTO users (id, auth_user_id, email, full_name, role) VALUES
  ('cccccccc-0000-0000-0000-00000000000a','9a9a9a9a-0000-0000-0000-00000000000a','admin.a@h.com','Admin A','hospital'),
  ('cccccccc-0000-0000-0000-00000000000b','9b9b9b9b-0000-0000-0000-00000000000b','admin.b@h.com','Admin B','hospital'),
  ('dddddddd-0000-0000-0000-0000000000a1', NULL,'pa@t.com','Patient A','patient'),
  ('dddddddd-0000-0000-0000-0000000000b1', NULL,'pb@t.com','Patient B','patient');
INSERT INTO hospital_admins (hospital_id, user_id, email) VALUES
  ('44444444-4444-4444-4444-444444444444','cccccccc-0000-0000-0000-00000000000a','admin.a@h.com'),
  ('55555555-5555-5555-5555-555555555555','cccccccc-0000-0000-0000-00000000000b','admin.b@h.com');
INSERT INTO patients (user_id, blood_group, primary_hospital_id) VALUES
  ('dddddddd-0000-0000-0000-0000000000a1','A+','44444444-4444-4444-4444-444444444444'),
  ('dddddddd-0000-0000-0000-0000000000b1','B+','55555555-5555-5555-5555-555555555555');
INSERT INTO sos_requests (id, patient_id) VALUES
  ('60660000-0000-0000-0000-0000000000a1','dddddddd-0000-0000-0000-0000000000a1'),
  ('60660000-0000-0000-0000-0000000000b1','dddddddd-0000-0000-0000-0000000000b1');

-- Become Admin A, as a real authenticated client would be.
SET ROLE authenticated;
SET test.auth_uid = '9a9a9a9a-0000-0000-0000-00000000000a';

SELECT ck('RLS A resolves own hospital',
  (SELECT array_length(current_hospital_ids(),1)::text), '1');
SELECT ck('RLS A sees only own registrations',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations), '1');
SELECT ck('RLS A sees own patient only',
  (SELECT patient_name FROM hospital_patient_registrations), 'Patient A');
SELECT ck('RLS A sees only own alerts',
  (SELECT COUNT(*)::text FROM hospital_sos_alerts), '1');
SELECT ck('RLS A cannot reach B by explicit id',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations
   WHERE hospital_id='55555555-5555-5555-5555-555555555555'), '0');
SELECT ck('RLS A sees only own notifications',
  (SELECT COUNT(DISTINCT hospital_id)::text FROM hospital_notifications), '1');
-- Stronger than a filtered-to-zero read: there is no grant at all, so the
-- attempt is refused outright. A login token must never be client-readable.
DO $$ BEGIN
  PERFORM 1 FROM public.hospital_onboarding_tokens;
  RAISE EXCEPTION 'FAIL onboarding tokens were readable by an authenticated client';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS  RLS onboarding tokens denied to client (42501)';
END $$;
DO $$ BEGIN
  PERFORM 1 FROM public.hospital_audit_log;
  RAISE EXCEPTION 'FAIL audit log was readable by its own subject';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS  RLS audit log denied to client (42501)';
END $$;

-- Swap identity: the same session must now see only B.
SET test.auth_uid = '9b9b9b9b-0000-0000-0000-00000000000b';
SELECT ck('RLS B sees only own patient',
  (SELECT patient_name FROM hospital_patient_registrations), 'Patient B');

-- A signed-in user who is not a hospital admin at all sees nothing.
SET test.auth_uid = '00000000-0000-0000-0000-0000000000ff';
SELECT ck('RLS non-admin sees no registrations',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations), '0');
SELECT ck('RLS non-admin sees no alerts',
  (SELECT COUNT(*)::text FROM hospital_sos_alerts), '0');

RESET ROLE;
-- anon must be refused outright, not merely filtered.
SET ROLE anon;
DO $$ BEGIN
  PERFORM 1 FROM public.hospital_patient_registrations;
  RAISE EXCEPTION 'FAIL anon could read hospital_patient_registrations';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS  RLS anon denied registrations (42501)';
END $$;
DO $$ BEGIN
  PERFORM 1 FROM public.hospital_sos_alerts;
  RAISE EXCEPTION 'FAIL anon could read hospital_sos_alerts';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS  RLS anon denied alerts (42501)';
END $$;
RESET ROLE;
SELECT '--- ALL RLS ISOLATION TESTS PASSED ---' AS result;
