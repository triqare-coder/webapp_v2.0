#!/usr/bin/env node
/**
 * Triqare — create one REAL (loginable) Clerk account per role, sync to Supabase,
 * then drive a single SOS request through its full lifecycle and verify each step.
 *
 * Reads ../.env.local (needs Clerk TEST keys + Supabase service role).
 * Idempotent: wipes prior @test.com Clerk + Supabase rows before recreating.
 *
 *   npm run seed:test        (from web-production/)
 *   node scripts/seed-and-test.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { createClerkClient } = require('@clerk/backend');

const PROJECT = path.join(__dirname, '..');
const PASSWORD = process.env.TEST_PASSWORD || 'Triqare-Test-2026!Xq';
const LOC = { lat: 12.9716, lon: 77.5945983 }; // Bangalore — co-locate patient + driver

const USERS = [
  { role: 'admin',             email: 'admin@test.com',   firstName: 'Aria', lastName: 'Admin' },
  { role: 'ert',               email: 'ert@test.com',     firstName: 'Eric', lastName: 'Responder' },
  { role: 'transport_company', email: 'company@test.com', firstName: 'Tina', lastName: 'Transport', companyName: 'Test Ambulance Co', regNumber: 'TEST-REG-0001' },
  { role: 'driver',            email: 'driver@test.com',  firstName: 'Dan',  lastName: 'Driver', phone: '+919800000004', license: 'TEST-DL-9001' },
  { role: 'patient',           email: 'patient@test.com', firstName: 'Pat',  lastName: 'Patient', phone: '+919800000005', gender: 'Male', blood: 'O+', dob: '1990-01-01' },
];
const ALL_EMAILS = USERS.map(u => u.email);

function loadEnv() {
  const out = {};
  fs.readFileSync(path.join(PROJECT, '.env.local'), 'utf8').split('\n').forEach(l => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
  return out;
}
const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

const log = (...a) => console.log(...a);
const ok = (m) => log('   \x1b[32m✓\x1b[0m ' + m);
const info = (m) => log('   \x1b[36mℹ\x1b[0m ' + m);
const warn = (m) => log('   \x1b[33m!\x1b[0m ' + m);
const nowIso = () => new Date().toISOString();

async function cleanup() {
  log('\n\x1b[1m[1/4] Cleanup prior @test.com data\x1b[0m');
  const { data: existing } = await sb.from('users').select('id, role').like('email', '%@test.com');
  const ids = (existing || []).map(u => u.id);
  if (ids.length) {
    const patientIds = (existing || []).filter(u => u.role === 'patient').map(u => u.id);
    await sb.from('sos_requests').delete().in('driver_id', ids);
    if (patientIds.length) { await sb.from('sos_requests').delete().in('patient_id', patientIds); await sb.from('emergency_contacts').delete().in('patient_id', patientIds); }
    await sb.from('drivers').delete().in('user_id', ids);
    await sb.from('patients').delete().in('user_id', ids);
    await sb.from('transport_companies').delete().in('user_id', ids);
    await sb.from('users').delete().in('id', ids);
    ok(`removed ${ids.length} prior Supabase user(s) + dependents`);
  } else info('no prior Supabase rows');
  let removed = 0; const page = await clerk.users.getUserList({ limit: 200 });
  for (const u of (page.data || page)) {
    const em = u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || '';
    if (em.endsWith('@test.com')) { await clerk.users.deleteUser(u.id); removed++; }
  }
  removed ? ok(`removed ${removed} prior Clerk user(s)`) : info('no prior Clerk users');
}

async function createUsers() {
  log('\n\x1b[1m[2/4] Create Clerk accounts + Supabase rows (5 roles)\x1b[0m');
  const created = {};
  for (const u of USERS) {
    const clerkUser = await clerk.users.createUser({
      emailAddress: [u.email], password: PASSWORD, firstName: u.firstName, lastName: u.lastName,
      skipPasswordChecks: true, publicMetadata: { role: u.role }, unsafeMetadata: { role: u.role },
    });
    const { data: dbUser, error: ue } = await sb.from('users').insert({
      clerk_user_id: clerkUser.id, email: u.email, first_name: u.firstName, last_name: u.lastName,
      full_name: `${u.firstName} ${u.lastName}`, phone: u.phone || null, role: u.role, is_active: true,
    }).select().single();
    if (ue) throw new Error(`users insert ${u.email}: ${ue.message}`);
    if (u.role === 'transport_company') {
      const { error } = await sb.from('transport_companies').insert({ user_id: dbUser.id, company_name: u.companyName, registration_number: u.regNumber, is_verified: true });
      if (error) throw new Error(`transport_companies ${u.email}: ${error.message}`);
    } else if (u.role === 'patient') {
      const { error } = await sb.from('patients').insert({ user_id: dbUser.id, dob: u.dob, gender: u.gender, blood_group: u.blood, latitude: LOC.lat, longitude: LOC.lon });
      if (error) throw new Error(`patients ${u.email}: ${error.message}`);
    }
    created[u.role] = { clerkId: clerkUser.id, dbId: dbUser.id, email: u.email, def: u };
    ok(`${u.role.padEnd(18)} ${u.email.padEnd(18)} clerk=${clerkUser.id}`);
  }
  const driver = created.driver, company = created.transport_company;
  const { error: de } = await sb.from('drivers').insert({
    user_id: driver.dbId, transport_company_id: company.dbId, license_number: driver.def.license,
    status: 'available', is_verified: true, is_available: true, latitude: LOC.lat, longitude: LOC.lon,
    firstname: driver.def.firstName, lastname: driver.def.lastName, last_updated_at: nowIso(),
  });
  if (de) throw new Error(`drivers insert: ${de.message}`);
  ok(`driver profile linked to company ${company.email} (status=available)`);
  return created;
}

async function runSosFlow(created) {
  log('\n\x1b[1m[3/4] Drive SOS request through full lifecycle\x1b[0m');
  const patient = created.patient, driver = created.driver, history = [];
  const push = (status) => history.push({ status, timestamp: nowIso() });
  push('SOS Triggered');
  const { data: sos, error: se } = await sb.from('sos_requests').insert({
    patient_id: patient.dbId, status: 'SOS Triggered', location_lat: LOC.lat, location_lon: LOC.lon,
    patient_name: `${patient.def.firstName} ${patient.def.lastName}`, patient_phone: patient.def.phone,
    auto_assigned: false, requested_at: nowIso(), status_history: JSON.stringify(history),
  }).select().single();
  if (se) throw new Error(`sos insert: ${se.message}`);
  ok(`patient triggers SOS -> id=${sos.id.slice(0, 8)} status='SOS Triggered'`);

  const { data: avail } = await sb.from('drivers').select('user_id, status').eq('status', 'available').limit(20);
  const chosen = (avail || []).find(d => d.user_id === driver.dbId) || (avail || [])[0];
  if (!chosen) throw new Error('no available driver found for assignment');
  info(`${(avail || []).length} available driver(s); assigning ${chosen.user_id === driver.dbId ? 'our test driver' : 'nearest'}`);

  push('Driver En Route');
  await sb.from('sos_requests').update({
    status: 'Driver En Route', assigned_at: nowIso(), auto_assigned: true, driver_id: driver.dbId,
    driver_name: `${driver.def.firstName} ${driver.def.lastName}`, driver_phone: driver.def.phone, status_history: JSON.stringify(history),
  }).eq('id', sos.id);
  await sb.from('drivers').update({ status: 'on_trip', is_available: false, current_request_id: sos.id }).eq('user_id', driver.dbId);
  ok("assign nearest driver -> status='Driver En Route', driver now 'on_trip'");

  for (const status of ['Transport Arrived', 'User Picked Up', 'Arrived at Hospital']) {
    push(status);
    const patch = { status, status_history: JSON.stringify(history) };
    if (status === 'Arrived at Hospital') patch.completed_at = nowIso();
    const { error } = await sb.from('sos_requests').update(patch).eq('id', sos.id);
    if (error) throw new Error(`status -> ${status}: ${error.message}`);
    ok(`status -> '${status}'`);
  }
  await sb.from('drivers').update({ status: 'available', is_available: true, current_request_id: null }).eq('user_id', driver.dbId);
  ok('trip complete -> driver released back to available');
  return sos.id;
}

async function verify(created, sosId) {
  log('\n\x1b[1m[4/4] Verify end state\x1b[0m');
  let pass = 0, fail = 0;
  const check = (cond, msg) => { cond ? (ok(msg), pass++) : (warn('FAIL: ' + msg), fail++); };
  const { data: users } = await sb.from('users').select('id, role').in('email', ALL_EMAILS);
  check((users || []).length === 5, `5 users present (${(users || []).length})`);
  for (const role of ['admin', 'ert', 'transport_company', 'driver', 'patient']) check((users || []).some(u => u.role === role), `role '${role}' exists`);
  check(!!(await sb.from('patients').select('user_id').eq('user_id', created.patient.dbId).maybeSingle()).data, 'patients profile row exists');
  const { data: drv } = await sb.from('drivers').select('status, transport_company_id').eq('user_id', created.driver.dbId).maybeSingle();
  check(!!drv, 'drivers profile row exists');
  check(drv && drv.transport_company_id === created.transport_company.dbId, 'driver linked to test company');
  check(drv && drv.status === 'available', 'driver released to available after trip');
  const { data: sos } = await sb.from('sos_requests').select('*').eq('id', sosId).single();
  check(sos.status === 'Arrived at Hospital', `SOS final status = 'Arrived at Hospital'`);
  check(sos.driver_id === created.driver.dbId, 'SOS driver_id = test driver');
  check(!!sos.assigned_at && !!sos.completed_at, 'assigned_at + completed_at set');
  const hist = JSON.parse(sos.status_history);
  check(hist.length === 5, 'status_history has 5 transitions');
  info('lifecycle: ' + hist.map(h => h.status).join(' -> '));
  const adminClerk = await clerk.users.getUser(created.admin.clerkId);
  check(adminClerk.publicMetadata?.role === 'admin', 'Clerk admin metadata.role = admin (loginable)');
  log(`\n\x1b[1mRESULT: ${pass} passed, ${fail} failed\x1b[0m`);
  log('\nLogin credentials (Clerk TEST instance, /sign-in):');
  for (const u of USERS) log(`   ${u.role.padEnd(18)} ${u.email.padEnd(18)} password: ${PASSWORD}`);
  return fail === 0;
}

(async () => {
  log('\x1b[1m=== Triqare seed-and-test: 5 roles + SOS lifecycle ===\x1b[0m');
  info(`Supabase: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  info(`Clerk key: ${env.CLERK_SECRET_KEY.slice(0, 11)}… (${env.CLERK_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'})`);
  if (!env.CLERK_SECRET_KEY.startsWith('sk_test')) throw new Error('Refusing to run against a non-test Clerk key.');
  await cleanup();
  const created = await createUsers();
  const sosId = await runSosFlow(created);
  process.exit((await verify(created, sosId)) ? 0 : 1);
})().catch(e => { console.error('\n\x1b[31mFATAL:\x1b[0m', e.message); process.exit(1); });
