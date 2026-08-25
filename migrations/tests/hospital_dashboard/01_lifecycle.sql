\set ON_ERROR_STOP on
\pset pager off
CREATE OR REPLACE FUNCTION ck(label text, got text, want text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS NOT DISTINCT FROM want THEN RAISE NOTICE 'PASS  % => %', label, got;
  ELSE RAISE EXCEPTION 'FAIL  % => got [%] want [%]', label, got, want; END IF;
END $$;

-- Two QSoS hospitals + one patient who picks both.
INSERT INTO hospitals (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111','Pushpagiri Medical Centre'),
  ('22222222-2222-2222-2222-222222222222','Believers Church Medical College');
INSERT INTO users (id, email, full_name, phone, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','p1@test.com','Anil Kumar','+919876543210','patient');
INSERT INTO patients (user_id, blood_group, allergies, known_conditions,
                      primary_hospital_id, secondary_hospital_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001','O+','Penicillin','Diabetes Type II',
        '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');

-- US-002/003: registration fans out to both, ACTIVE, with snapshots.
SELECT ck('US-003 registrations created',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations WHERE status='ACTIVE' AND archived_at IS NULL), '2');
SELECT ck('US-003 snapshot name',
  (SELECT patient_name FROM hospital_patient_registrations WHERE registration_type='PRIMARY'), 'Anil Kumar');
SELECT ck('US-002 registration notifications',
  (SELECT COUNT(*)::text FROM hospital_notifications WHERE type='REGISTRATION'), '2');

-- US-006: SOS pages BOTH hospitals, both PENDING.
INSERT INTO sos_requests (id, patient_id, patient_name)
VALUES ('50550000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Anil Kumar');
SELECT ck('US-006 both hospitals paged',
  (SELECT COUNT(*)::text FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000001'), '2');
SELECT ck('US-006 both PENDING',
  (SELECT COUNT(DISTINCT status)::text||':'||MIN(status) FROM hospital_sos_alerts
   WHERE sos_request_id='50550000-0000-0000-0000-000000000001'), '1:PENDING');
SELECT ck('US-006 medical snapshot on alert',
  (SELECT blood_group||'/'||allergies FROM hospital_sos_alerts
   WHERE sos_request_id='50550000-0000-0000-0000-000000000001' AND registration_type='PRIMARY'), 'O+/Penicillin');

-- US-007 Scenario A. status_history is written by the mobile app as a jsonb
-- STRING SCALAR containing the array -- the exact live shape.
UPDATE sos_requests SET status='User Picked Up', status_history = to_jsonb(
  '[{"status":"SOS Triggered","timestamp":"2026-08-25T10:00:00Z"},
    {"status":"User Picked Up","timestamp":"2026-08-25T10:20:00Z","actor":"driver",
     "hospitalDetails":{"hospitalId":"11111111-1111-1111-1111-111111111111",
       "name":"Pushpagiri Medical Centre","latitude":9.2,"longitude":76.7,"kind":"primary"}}]'::text)
WHERE id='50550000-0000-0000-0000-000000000001';

SELECT ck('US-007 A primary CONFIRMED',
  (SELECT status FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000001'
   AND hospital_id='11111111-1111-1111-1111-111111111111'), 'CONFIRMED_INCOMING');
SELECT ck('US-007 A secondary CANCELLED',
  (SELECT status FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000001'
   AND hospital_id='22222222-2222-2222-2222-222222222222'), 'CANCELLED');

-- US-009: admitted at the confirmed hospital, cancelled at the other.
UPDATE sos_requests SET status='Arrived at Hospital' WHERE id='50550000-0000-0000-0000-000000000001';
SELECT ck('US-009 outcome ADMITTED',
  (SELECT outcome FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000001'
   AND hospital_id='11111111-1111-1111-1111-111111111111'), 'ADMITTED');
SELECT ck('US-009 outcome CANCELLED elsewhere',
  (SELECT outcome FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000001'
   AND hospital_id='22222222-2222-2222-2222-222222222222'), 'CANCELLED');

-- US-007 Scenario C: an off-platform facility stands both hospitals down.
INSERT INTO sos_requests (id, patient_id, patient_name)
VALUES ('50550000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Anil Kumar');
UPDATE sos_requests SET status='User Picked Up', status_history = to_jsonb(
  '[{"status":"User Picked Up","hospitalDetails":{"placeId":"ChIJxyz","name":"Some Clinic",
     "latitude":9.3,"longitude":76.8,"kind":"nearby"}}]'::text)
WHERE id='50550000-0000-0000-0000-000000000003';
SELECT ck('US-007 C both CANCELLED',
  (SELECT COUNT(*)::text FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000003'
   AND status='CANCELLED'), '2');
SELECT ck('US-007 C exact destination label',
  (SELECT DISTINCT destination_label FROM hospital_sos_alerts
   WHERE sos_request_id='50550000-0000-0000-0000-000000000003'), 'Nearest Hospital (Off-Platform)');
SELECT ck('US-009 C ETA blank',
  (SELECT COALESCE(MAX(eta_at_confirmation_minutes)::text,'null') FROM hospital_sos_alerts
   WHERE sos_request_id='50550000-0000-0000-0000-000000000003'), 'null');

-- US-004: preference change away removes the row entirely (archived, not INACTIVE).
INSERT INTO hospitals (id,name) VALUES ('33333333-3333-3333-3333-333333333333','Holy Cross Hospital');
UPDATE patients SET primary_hospital_id='33333333-3333-3333-3333-333333333333'
 WHERE user_id='aaaaaaaa-0000-0000-0000-000000000001';
SELECT ck('US-004 old hospital row archived',
  (SELECT archived_at IS NOT NULL FROM hospital_patient_registrations
   WHERE hospital_id='11111111-1111-1111-1111-111111111111' AND registration_type='PRIMARY')::text, 'true');
SELECT ck('US-004 exact leave message',
  (SELECT message FROM hospital_notifications WHERE type='PREFERENCE_CHANGE'
   AND hospital_id='11111111-1111-1111-1111-111111111111'),
  'Anil Kumar has updated their hospital preference and is no longer registered with you.');
SELECT ck('US-004 new hospital registered',
  (SELECT status FROM hospital_patient_registrations
   WHERE hospital_id='33333333-3333-3333-3333-333333333333'), 'ACTIVE');

-- US-005: account deletion -> INACTIVE, notification, and history survives the
-- users -> patients -> sos_requests cascade.
DELETE FROM users WHERE id='aaaaaaaa-0000-0000-0000-000000000001';
SELECT ck('US-005 registration INACTIVE',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations WHERE status='INACTIVE'), '2');
SELECT ck('US-005 exact deletion message',
  (SELECT message FROM hospital_notifications WHERE type='ACCOUNT_DELETED' LIMIT 1),
  'Anil Kumar''s QSoS account has been deleted. Their profile is now inactive.');
SELECT ck('US-005 sos_requests really cascaded away',
  (SELECT COUNT(*)::text FROM sos_requests), '0');
SELECT ck('US-009 admission history SURVIVED the cascade',
  (SELECT COUNT(*)::text FROM hospital_sos_alerts), '4');
SELECT ck('US-009 name retained after deletion',
  (SELECT DISTINCT patient_name FROM hospital_sos_alerts WHERE outcome='ADMITTED'), 'Anil Kumar');
SELECT ck('US-009 blood group retained',
  (SELECT DISTINCT blood_group FROM hospital_sos_alerts WHERE outcome='ADMITTED'), 'O+');

-- US-005 AC3: same person returns on a new account -> new ACTIVE record, old archived.
INSERT INTO users (id,email,full_name,phone,role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000002','p1b@test.com','Anil Kumar','+919876543210','patient');
INSERT INTO patients (user_id, blood_group, primary_hospital_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002','O+','33333333-3333-3333-3333-333333333333');
SELECT ck('US-005 AC3 new ACTIVE record',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations
   WHERE hospital_id='33333333-3333-3333-3333-333333333333' AND status='ACTIVE' AND archived_at IS NULL), '1');
SELECT ck('US-005 AC3 old INACTIVE record archived',
  (SELECT COUNT(*)::text FROM hospital_patient_registrations
   WHERE hospital_id='33333333-3333-3333-3333-333333333333' AND status='INACTIVE' AND archived_at IS NOT NULL), '1');

-- US-005: an INACTIVE patient must not page a hospital.
INSERT INTO users (id,email,full_name,role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000009','gone@test.com','Ghost Patient','patient');
INSERT INTO patients (user_id, primary_hospital_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111');
UPDATE hospital_patient_registrations SET status='INACTIVE'
 WHERE patient_id='aaaaaaaa-0000-0000-0000-000000000009';
INSERT INTO sos_requests (id, patient_id) VALUES
  ('50550000-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000009');
SELECT ck('US-005 inactive patient raises no beacon',
  (SELECT COUNT(*)::text FROM hospital_sos_alerts WHERE sos_request_id='50550000-0000-0000-0000-000000000009'), '0');

-- users.role now admits 'hospital'.
INSERT INTO users (id,email,role) VALUES ('bbbbbbbb-0000-0000-0000-000000000001','ha@hosp.com','hospital');
SELECT ck('US-001 hospital role accepted',
  (SELECT role FROM users WHERE id='bbbbbbbb-0000-0000-0000-000000000001'), 'hospital');

SELECT '--- ALL TRIGGER TESTS PASSED ---' AS result;
