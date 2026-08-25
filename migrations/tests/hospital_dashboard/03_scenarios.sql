-- Run via migrations/tests/hospital_dashboard/run.sh (needs ck() from 01_lifecycle).
\set ON_ERROR_STOP on
-- US-007 Scenario B: driver picks the SECONDARY hospital.
INSERT INTO hospitals (id,name) VALUES
  ('77777777-7777-7777-7777-777777777777','Prim H'),('88888888-8888-8888-8888-888888888888','Sec H');
INSERT INTO users (id,email,full_name,role) VALUES ('eeeeeeee-0000-0000-0000-000000000001','b@t.com','Bee Patient','patient');
INSERT INTO patients (user_id, blood_group, primary_hospital_id, secondary_hospital_id)
VALUES ('eeeeeeee-0000-0000-0000-000000000001','AB-','77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888');
INSERT INTO sos_requests (id, patient_id) VALUES ('70770000-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001');
UPDATE sos_requests SET status='User Picked Up', status_history = to_jsonb(
  '[{"status":"User Picked Up","hospitalDetails":{"hospitalId":"88888888-8888-8888-8888-888888888888",
     "name":"Sec H","latitude":9.1,"longitude":76.6,"kind":"secondary"}}]'::text)
WHERE id='70770000-0000-0000-0000-000000000001';
SELECT ck('US-007 B secondary CONFIRMED',
  (SELECT status FROM hospital_sos_alerts WHERE sos_request_id='70770000-0000-0000-0000-000000000001'
   AND hospital_id='88888888-8888-8888-8888-888888888888'), 'CONFIRMED_INCOMING');
SELECT ck('US-007 B primary CANCELLED',
  (SELECT status FROM hospital_sos_alerts WHERE sos_request_id='70770000-0000-0000-0000-000000000001'
   AND hospital_id='77777777-7777-7777-7777-777777777777'), 'CANCELLED');
SELECT ck('US-007 B cancelled row names the real destination',
  (SELECT destination_label FROM hospital_sos_alerts WHERE sos_request_id='70770000-0000-0000-0000-000000000001'
   AND hospital_id='77777777-7777-7777-7777-777777777777'), 'Sec H');

-- Driver reselects mid-trip: the LAST hospitalDetails entry must win.
UPDATE sos_requests SET status_history = to_jsonb(
  '[{"status":"User Picked Up","hospitalDetails":{"hospitalId":"88888888-8888-8888-8888-888888888888","name":"Sec H","latitude":9.1,"longitude":76.6,"kind":"secondary"}},
    {"status":"User Picked Up","hospitalDetails":{"hospitalId":"77777777-7777-7777-7777-777777777777","name":"Prim H","latitude":9.0,"longitude":76.5,"kind":"primary"}}]'::text)
WHERE id='70770000-0000-0000-0000-000000000001';
SELECT ck('US-007 reselection: latest entry wins',
  (SELECT status FROM hospital_sos_alerts WHERE sos_request_id='70770000-0000-0000-0000-000000000001'
   AND hospital_id='77777777-7777-7777-7777-777777777777'), 'CONFIRMED_INCOMING');

-- Timed Out (no driver) must close the incident, not leave it PENDING forever.
INSERT INTO sos_requests (id, patient_id) VALUES ('70770000-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000001');
UPDATE sos_requests SET status='Timed Out' WHERE id='70770000-0000-0000-0000-000000000002';
SELECT ck('Timed Out closes the alert',
  (SELECT DISTINCT status||'/'||outcome FROM hospital_sos_alerts WHERE sos_request_id='70770000-0000-0000-0000-000000000002'),
  'CANCELLED/CANCELLED');

-- Malformed status_history must not abort the driver's write.
INSERT INTO sos_requests (id, patient_id) VALUES ('70770000-0000-0000-0000-000000000003','eeeeeeee-0000-0000-0000-000000000001');
UPDATE sos_requests SET status_history = to_jsonb('not json at all'::text) WHERE id='70770000-0000-0000-0000-000000000003';
SELECT ck('malformed status_history survives', 'ok', 'ok');
SELECT '--- SCENARIO B + EDGE CASES PASSED ---' AS result;
