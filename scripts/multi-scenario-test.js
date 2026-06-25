#!/usr/bin/env node
/**
 * Triqare — multi-scenario SOS test harness.
 * Pool: admin, ert, transport_company, 3 drivers, 3 patients (all REAL Clerk + Supabase).
 * Scenarios:
 *   1 happy path (nearest auto-assign, full lifecycle)
 *   2 cancel before assignment
 *   3 cancel mid-trip (driver released)
 *   4 no driver available (stays unassigned)
 *   5 concurrent SOS (no double-booking)
 *   6 manual ERT reassignment (driver swap)
 *
 *   npm run test:scenarios     (from web-production/)
 *   node scripts/multi-scenario-test.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { createClerkClient } = require('@clerk/backend');

const PROJECT = path.join(__dirname, '..');
const PASSWORD = process.env.TEST_PASSWORD || 'Triqare-Test-2026!Xq';
const BASE = { lat: 12.9716, lon: 77.5946 };

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

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m', b: '\x1b[1m', x: '\x1b[0m' };
const log = (...a) => console.log(...a);
const ok = (m) => log(`     ${C.g}✓${C.x} ${m}`);
const bad = (m) => log(`     ${C.r}✗ ${m}${C.x}`);
const info = (m) => log(`     ${C.c}ℹ${C.x} ${m}`);
const nowIso = () => new Date().toISOString();
const hav = (a, b) => {
  const R = 6371000, t = x => x * Math.PI / 180;
  const dLat = t(b.lat - a.lat), dLon = t((b.lon ?? b.lng) - (a.lon ?? a.lng));
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const off = (dlat, dlon) => ({ lat: BASE.lat + dlat, lon: BASE.lon + dlon });
const CORE = [
  { role: 'admin',             email: 'admin@test.com',   firstName: 'Aria', lastName: 'Admin' },
  { role: 'ert',               email: 'ert@test.com',     firstName: 'Eric', lastName: 'Responder' },
  { role: 'transport_company', email: 'company@test.com', firstName: 'Tina', lastName: 'Transport', companyName: 'Test Ambulance Co', regNumber: 'TEST-REG-0001' },
];
const DRIVERS = [
  { key: 'd1', email: 'driver1@test.com', firstName: 'Drv1', lastName: 'Test', phone: '+919800000010', license: 'TEST-DL-9001', loc: off(0, 0) },
  { key: 'd2', email: 'driver2@test.com', firstName: 'Drv2', lastName: 'Test', phone: '+919800000020', license: 'TEST-DL-9002', loc: off(0.020, 0.010) },
  { key: 'd3', email: 'driver3@test.com', firstName: 'Drv3', lastName: 'Test', phone: '+919800000030', license: 'TEST-DL-9003', loc: off(0.050, 0.030) },
].map(d => ({ ...d, role: 'driver' }));
const PATIENTS = [
  { key: 'p1', email: 'patient1@test.com', firstName: 'Pat1', lastName: 'Test', phone: '+919800001010', loc: off(0.001, 0.000) },
  { key: 'p2', email: 'patient2@test.com', firstName: 'Pat2', lastName: 'Test', phone: '+919800001020', loc: off(0.021, 0.011) },
  { key: 'p3', email: 'patient3@test.com', firstName: 'Pat3', lastName: 'Test', phone: '+919800001030', loc: off(0.010, 0.005) },
].map(p => ({ ...p, role: 'patient', gender: 'Male', blood: 'O+', dob: '1990-01-01' }));
const ALL_DEFS = [...CORE, ...DRIVERS, ...PATIENTS];
const POOL = {};

async function cleanup() {
  log(`${C.b}[setup] cleanup prior @test.com (Clerk + Supabase)${C.x}`);
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
    info(`removed ${ids.length} Supabase user(s) + dependents`);
  } else info('no prior Supabase rows');
  let removed = 0; const page = await clerk.users.getUserList({ limit: 200 });
  for (const u of (page.data || page)) {
    const em = u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || '';
    if (em.endsWith('@test.com')) { await clerk.users.deleteUser(u.id); removed++; }
  }
  info(`removed ${removed} Clerk @test.com user(s)`);
}

async function createUser(def) {
  const cu = await clerk.users.createUser({
    emailAddress: [def.email], password: PASSWORD, firstName: def.firstName, lastName: def.lastName,
    skipPasswordChecks: true, publicMetadata: { role: def.role }, unsafeMetadata: { role: def.role },
  });
  const { data: dbUser, error } = await sb.from('users').insert({
    clerk_user_id: cu.id, email: def.email, first_name: def.firstName, last_name: def.lastName,
    full_name: `${def.firstName} ${def.lastName}`, phone: def.phone || null, role: def.role, is_active: true,
  }).select().single();
  if (error) throw new Error(`users ${def.email}: ${error.message}`);
  return { clerkId: cu.id, dbId: dbUser.id, def };
}

async function createPool() {
  log(`\n${C.b}[setup] create pool: admin, ert, company, 3 drivers, 3 patients${C.x}`);
  for (const def of CORE) {
    const u = await createUser(def); POOL[def.role] = u;
    if (def.role === 'transport_company') await sb.from('transport_companies').insert({ user_id: u.dbId, company_name: def.companyName, registration_number: def.regNumber, is_verified: true });
  }
  for (const def of PATIENTS) {
    const u = await createUser(def); POOL[def.key] = u;
    const { error } = await sb.from('patients').insert({ user_id: u.dbId, dob: def.dob, gender: def.gender, blood_group: def.blood, latitude: def.loc.lat, longitude: def.loc.lon });
    if (error) throw new Error(`patients ${def.email}: ${error.message}`);
  }
  for (const def of DRIVERS) {
    const u = await createUser(def); POOL[def.key] = u;
    const { error } = await sb.from('drivers').insert({
      user_id: u.dbId, transport_company_id: POOL.transport_company.dbId, license_number: def.license,
      status: 'available', is_verified: true, is_available: true, latitude: def.loc.lat, longitude: def.loc.lon,
      firstname: def.firstName, lastname: def.lastName, last_updated_at: nowIso(),
    });
    if (error) throw new Error(`drivers ${def.email}: ${error.message}`);
  }
  info('pool ready: ' + Object.keys(POOL).join(', '));
}

const testDriverIds = () => DRIVERS.map(d => POOL[d.key].dbId);
async function resetDrivers() { await sb.from('drivers').update({ status: 'available', is_available: true, current_request_id: null }).in('user_id', testDriverIds()); }
async function availableTestDrivers() { return (await sb.from('drivers').select('user_id, latitude, longitude, status').eq('status', 'available').in('user_id', testDriverIds())).data || []; }
function nearest(loc, drivers) { return drivers.map(d => ({ d, m: hav(loc, { lat: +d.latitude, lon: +d.longitude }) })).sort((a, b) => a.m - b.m)[0]; }
async function triggerSOS(pkey) {
  const p = POOL[pkey], loc = p.def.loc, hist = [{ status: 'SOS Triggered', timestamp: nowIso() }];
  const { data, error } = await sb.from('sos_requests').insert({
    patient_id: p.dbId, status: 'SOS Triggered', location_lat: loc.lat, location_lon: loc.lon,
    patient_name: `${p.def.firstName} ${p.def.lastName}`, patient_phone: p.def.phone, auto_assigned: false,
    requested_at: nowIso(), status_history: JSON.stringify(hist),
  }).select().single();
  if (error) throw new Error(`trigger ${pkey}: ${error.message}`);
  return { id: data.id, hist, patientLoc: loc };
}
async function assignDriver(sos, dkey, { auto = true } = {}) {
  const d = POOL[dkey]; sos.hist.push({ status: 'Driver En Route', timestamp: nowIso() });
  await sb.from('sos_requests').update({
    status: 'Driver En Route', assigned_at: nowIso(), auto_assigned: auto, driver_id: d.dbId,
    driver_name: `${d.def.firstName} ${d.def.lastName}`, driver_phone: d.def.phone, status_history: JSON.stringify(sos.hist),
  }).eq('id', sos.id);
  await sb.from('drivers').update({ status: 'on_trip', is_available: false, current_request_id: sos.id }).eq('user_id', d.dbId);
  sos.driverKey = dkey;
}
async function setStatus(sos, status, { complete = false } = {}) {
  sos.hist.push({ status, timestamp: nowIso() });
  const patch = { status, status_history: JSON.stringify(sos.hist) };
  if (complete) patch.completed_at = nowIso();
  await sb.from('sos_requests').update(patch).eq('id', sos.id);
}
async function releaseDriver(dkey) { await sb.from('drivers').update({ status: 'available', is_available: true, current_request_id: null }).eq('user_id', POOL[dkey].dbId); }
const getSOS = async (id) => (await sb.from('sos_requests').select('*').eq('id', id).single()).data;
const getDriver = async (dkey) => (await sb.from('drivers').select('*').eq('user_id', POOL[dkey].dbId).single()).data;

const results = [];
async function scenario(name, fn) {
  log(`\n${C.b}▶ ${name}${C.x}`);
  const checks = [];
  const expect = (cond, msg) => { (cond ? ok : bad)(msg); checks.push(cond); };
  try { await fn(expect); } catch (e) { bad('threw: ' + e.message); checks.push(false); }
  results.push({ name, pass: checks.length > 0 && checks.every(Boolean), n: checks.length, failed: checks.filter(c => !c).length });
  await resetDrivers();
}

async function main() {
  log(`${C.b}=== Triqare multi-scenario SOS test ===${C.x}`);
  info(`Supabase ${env.NEXT_PUBLIC_SUPABASE_URL}`);
  info(`Clerk ${env.CLERK_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
  if (!env.CLERK_SECRET_KEY.startsWith('sk_test')) throw new Error('Refusing non-test Clerk key');
  await cleanup();
  await createPool();

  await scenario('Scenario 1 — happy path (nearest auto-assign, full lifecycle)', async (expect) => {
    const sos = await triggerSOS('p1');
    const cand = await availableTestDrivers(), near = nearest(sos.patientLoc, cand);
    const nearKey = DRIVERS.find(d => POOL[d.key].dbId === near.d.user_id).key;
    info(`nearest of ${cand.length} = ${nearKey} (${Math.round(near.m)} m)`);
    expect(nearKey === 'd1', 'nearest driver is d1 (co-located with p1)');
    await assignDriver(sos, nearKey);
    for (const s of ['Transport Arrived', 'User Picked Up']) await setStatus(sos, s);
    await setStatus(sos, 'Arrived at Hospital', { complete: true });
    await releaseDriver(nearKey);
    const row = await getSOS(sos.id);
    expect(row.status === 'Arrived at Hospital', "final status 'Arrived at Hospital'");
    expect(row.driver_id === POOL.d1.dbId && !!row.assigned_at && !!row.completed_at, 'driver_id + assigned_at + completed_at set');
    expect(JSON.parse(row.status_history).length === 5, 'status_history has 5 transitions');
    expect((await getDriver('d1')).status === 'available', 'driver released to available');
  });

  await scenario('Scenario 2 — cancel before assignment (pool untouched)', async (expect) => {
    const before = (await availableTestDrivers()).length;
    const sos = await triggerSOS('p2');
    await setStatus(sos, 'Cancelled');
    const row = await getSOS(sos.id);
    expect(row.status === 'Cancelled', "status 'Cancelled'");
    expect(row.driver_id === null, 'no driver attached');
    expect((await availableTestDrivers()).length === before, `all ${before} drivers still available`);
  });

  await scenario('Scenario 3 — cancel mid-trip (assigned driver released)', async (expect) => {
    const sos = await triggerSOS('p3');
    await assignDriver(sos, 'd2');
    await setStatus(sos, 'Transport Arrived');
    expect((await getDriver('d2')).status === 'on_trip', 'd2 is on_trip mid-assignment');
    await setStatus(sos, 'Cancelled');
    await releaseDriver('d2');
    const row = await getSOS(sos.id), d2 = await getDriver('d2');
    expect(row.status === 'Cancelled', "status 'Cancelled' mid-trip");
    expect(d2.status === 'available' && d2.current_request_id === null, 'd2 released back to available');
  });

  await scenario('Scenario 4 — no driver available (stays unassigned)', async (expect) => {
    await sb.from('drivers').update({ status: 'inactive', is_available: false }).in('user_id', testDriverIds());
    const sos = await triggerSOS('p1');
    const cand = await availableTestDrivers();
    expect(cand.length === 0, 'zero available test drivers');
    const row = await getSOS(sos.id);
    expect(row.status === 'SOS Triggered', "SOS remains 'SOS Triggered' (no assignment)");
    expect(row.driver_id === null, 'no driver attached');
  });

  await scenario('Scenario 5 — concurrent SOS (no driver double-booking)', async (expect) => {
    const a = await triggerSOS('p1'), b = await triggerSOS('p2');
    let cand = await availableTestDrivers();
    const kA = DRIVERS.find(d => POOL[d.key].dbId === nearest(a.patientLoc, cand).d.user_id).key;
    await assignDriver(a, kA);
    cand = await availableTestDrivers();
    const kB = DRIVERS.find(d => POOL[d.key].dbId === nearest(b.patientLoc, cand).d.user_id).key;
    await assignDriver(b, kB);
    info(`p1→${kA}, p2→${kB}`);
    const rowA = await getSOS(a.id), rowB = await getSOS(b.id);
    expect(rowA.driver_id && rowB.driver_id && rowA.driver_id !== rowB.driver_id, 'two SOS got two distinct drivers');
    expect(kA !== kB, 'no driver assigned to both requests');
    const busy = (await sb.from('drivers').select('status').in('user_id', [POOL[kA].dbId, POOL[kB].dbId])).data;
    expect(busy.every(d => d.status === 'on_trip'), 'both assigned drivers are on_trip');
    await releaseDriver(kA); await releaseDriver(kB);
  });

  await scenario('Scenario 6 — manual ERT reassignment (driver swap)', async (expect) => {
    const sos = await triggerSOS('p3');
    await assignDriver(sos, 'd1');
    expect((await getSOS(sos.id)).driver_id === POOL.d1.dbId, 'initially assigned to d1');
    await releaseDriver('d1');
    const d3 = POOL.d3;
    await sb.from('sos_requests').update({ driver_id: d3.dbId, driver_name: `${d3.def.firstName} ${d3.def.lastName}`, driver_phone: d3.def.phone, auto_assigned: false }).eq('id', sos.id);
    await sb.from('drivers').update({ status: 'on_trip', is_available: false, current_request_id: sos.id }).eq('user_id', d3.dbId);
    for (const s of ['Transport Arrived', 'User Picked Up']) await setStatus(sos, s);
    await setStatus(sos, 'Arrived at Hospital', { complete: true });
    await releaseDriver('d3');
    const row = await getSOS(sos.id);
    expect(row.driver_id === d3.dbId, 'final driver_id = d3 (reassigned)');
    expect(row.auto_assigned === false, 'flagged as manual assignment');
    expect((await getDriver('d1')).status === 'available', 'original driver d1 freed');
    expect(row.status === 'Arrived at Hospital', 'trip completed under new driver');
  });

  log(`\n${C.b}=== SUMMARY ===${C.x}`);
  let totPass = 0;
  for (const r of results) { log(`  ${r.pass ? `${C.g}PASS${C.x}` : `${C.r}FAIL${C.x}`}  ${r.name}  (${r.n - r.failed}/${r.n})`); if (r.pass) totPass++; }
  log(`\n  ${C.b}${totPass}/${results.length} scenarios passed${C.x}`);
  log(`\n  Login (Clerk TEST /sign-in, password ${PASSWORD}):`);
  for (const d of ALL_DEFS) log(`    ${d.role.padEnd(18)} ${d.email}`);
  process.exit(totPass === results.length ? 0 : 1);
}
main().catch(e => { console.error(`${C.r}FATAL:${C.x}`, e.message); process.exit(1); });
