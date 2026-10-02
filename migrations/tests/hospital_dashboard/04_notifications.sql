-- Run via run.sh AFTER hospital_sos_notifications_dedupe.sql (needs ck() from 01_lifecycle).
\set ON_ERROR_STOP on
-- One notice per event: pick -> later stages -> arrival (live SOS bcd4e198 shape).
INSERT INTO hospitals (id,name) VALUES
  ('99999999-0000-0000-0000-000000000001','Notice Prim'),('99999999-0000-0000-0000-000000000002','Notice Sec');
INSERT INTO users (id,email,full_name,role) VALUES ('ffffffff-0000-0000-0000-000000000001','n@t.com','Nia Notice','patient');
INSERT INTO patients (user_id, primary_hospital_id, secondary_hospital_id)
VALUES ('ffffffff-0000-0000-0000-000000000001','99999999-0000-0000-0000-000000000001','99999999-0000-0000-0000-000000000002');
INSERT INTO sos_requests (id, patient_id) VALUES ('90990000-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001');

UPDATE sos_requests SET status='Driver En Route', status_history = to_jsonb(
  '[{"status":"SOS Triggered"},{"status":"Driver En Route"}]'::text) WHERE id='90990000-0000-0000-0000-000000000001';
SELECT ck('no destination yet: no status notice',
  (SELECT COUNT(*)::text FROM hospital_notifications WHERE type='SOS_STATUS' AND sos_request_id='90990000-0000-0000-0000-000000000001'), '0');

UPDATE sos_requests SET status='User Picked Up', status_history = to_jsonb(
  '[{"status":"SOS Triggered"},{"status":"Driver En Route"},{"status":"User Picked Up","hospitalDetails":{"hospitalId":"99999999-0000-0000-0000-000000000001","name":"Notice Prim","kind":"primary"}}]'::text)
WHERE id='90990000-0000-0000-0000-000000000001';
SELECT ck('destination picked: one notice per hospital',
  (SELECT COUNT(*)::text FROM hospital_notifications WHERE type='SOS_STATUS' AND sos_request_id='90990000-0000-0000-0000-000000000001'), '2');

UPDATE sos_requests SET status='Arrived at Hospital', status_history = to_jsonb(
  '[{"status":"SOS Triggered"},{"status":"Driver En Route"},{"status":"User Picked Up","hospitalDetails":{"hospitalId":"99999999-0000-0000-0000-000000000001","name":"Notice Prim","kind":"primary"}},{"status":"Arrived at Hospital"}]'::text)
WHERE id='90990000-0000-0000-0000-000000000001';
SELECT ck('arrival: no repeated confirmed/stand-down notices',
  (SELECT COUNT(*)::text FROM hospital_notifications WHERE type='SOS_STATUS' AND sos_request_id='90990000-0000-0000-0000-000000000001'
     AND message NOT LIKE '%has arrived%'), '2');
SELECT ck('arrival: admitting hospital told once',
  (SELECT COUNT(*)::text||':'||MIN(hospital_id::text) FROM hospital_notifications
   WHERE sos_request_id='90990000-0000-0000-0000-000000000001' AND message LIKE '%has arrived at your hospital%'),
  '1:99999999-0000-0000-0000-000000000001');
SELECT ck('arrival: outcomes unchanged by the patch',
  (SELECT string_agg(status||'/'||outcome, ',' ORDER BY registration_type) FROM hospital_sos_alerts
   WHERE sos_request_id='90990000-0000-0000-0000-000000000001'), 'CONFIRMED_INCOMING/ADMITTED,CANCELLED/CANCELLED');
SELECT '--- NOTIFICATION DEDUPE PASSED ---' AS result;
