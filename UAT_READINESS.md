# Triqare — UAT Readiness Checklist

_What must be done before handing the Emergency Response platform to the client for User Acceptance Testing._
_Status as of this audit. P0 = blocks UAT, P1 = needed for a clean UAT, P2 = nice-to-have / production hardening._

---

## 0. What already works (verified)
- ✅ Data model + SOS lifecycle proven end-to-end at the DB level: **6/6 scenarios pass** (`npm run test:scenarios`) — happy path, cancel-before, cancel-mid-trip, no-driver, concurrent (no double-booking), manual reassignment.
- ✅ Real loginable Clerk accounts for all 5 roles + synced Supabase rows (`npm run seed:test`).
- ✅ 195 hospitals + location hierarchy + 2 transport companies already seeded in the UAT Supabase.
- ✅ App builds & dev server boots (`npm run dev`), Clerk auth + role→dashboard routing in place.

---

## P0 — Blockers — ✅ FIXED & VERIFIED (this pass)

All P0 code defects are resolved and verified **end-to-end through the real Clerk-authenticated HTTP API** (20/20 assertions) plus the DB scenario harness (6/6). See `scripts/` and §Testing.

- [x] **B1 — SOS status updates** — `[id]/status/route.ts` + `[id]/route.ts` now normalize any legacy/canonical value to the DB's canonical workflow (`src/lib/sosStatus.ts`), accept **both PATCH and PUT**, append `status_history`, stamp `completed_at`, and release the driver on terminal states. Logic centralized in `SOSRequestService.updateStatus`.
- [x] **B2 — Driver assignment** — `assign-driver` + `[id]/assign` now delegate to `SOSRequestService.assignDriver`, which writes the canonical inline model (`driver_id/driver_name/driver_phone` + status `Driver En Route`), marks the driver `on_trip`/`current_request_id`, appends history, and enforces a **real double-booking guard** (verified: 2nd assignment of a busy driver → 400). Dual-writes the legacy junction for back-compat.
- [x] **B3 — SOS creation** — `POST /api/sos-requests` now persists `location_lat/lon` (accepts lat/lng aliases, falls back to the patient's saved location), denormalizes `patient_name/phone`, and initializes `status_history`.
- [x] **B4 — Status enum** — all DB **writers** (`sosRequestService` create/assign/updateStatus/getStats) aligned to the canonical 6 via the shared `sosStatus` helper. (Display-only legacy strings in components are cosmetic and tracked under P2/S4, not blocking.)
- [x] **B5 — `sos_request_assigned`** — standardized on the inline `sos_requests.driver_id` model as canonical; the junction is now dual-written for back-compat only and can be dropped in a later migration.
- [x] **Bonus — broken list/detail endpoints** — `GET /api/sos-requests` and `GET /api/sos-requests/[id]` were **500-ing** on PostgREST nested embeds (FK relationships absent from this DB's schema cache). Rewritten embed-free (batch-fetch + merge in JS). Also removed non-existent `updated_at` writes that crashed every update.

> ⚠️ These fixes are in `web-production` (the dispatch backend) and verified against the UAT Supabase. The **mobile app talks to Supabase directly** and already uses the inline model — but re-verify patient/driver mobile flows on-device (E3).

---

## P1 — Needed for a clean UAT

- [ ] **E1 — Stand up a stable hosted UAT environment** (Netlify/Vercel per `DEPLOYMENT_GUIDE.md`) with a **dedicated UAT Supabase** + **Clerk TEST keys**, so the client tests against a fixed URL, not a laptop.
- [ ] **E2 — Confirm Supabase Realtime is enabled** for `sos_requests`, `drivers`, `notifications` on the UAT project — the ERT/transport dashboards depend on live updates.
- [ ] **E3 — Mobile builds for patient & driver.** Patient and driver are **mobile-primary** (Expo `Triqare-app`). Clerk prod keys block localhost, so produce a **device build (APK / TestFlight)** pointed at the UAT backend with TEST keys. Web `/patient` and `/driver` are limited and not a substitute.
- [ ] **E4 — Push notifications (FCM).** `users.fcm_token` exists; verify assignment/SOS notifications actually deliver on device in UAT (firebase test scripts exist under `Triqare-app/scripts/`).
- [ ] **E5 — Seed the UAT dataset:** test accounts (`npm run seed:test`), subscription plans, a handful of drivers spread across the demo city, and verify hospital/location data is present.
- [ ] **E6 — Per-role UAT scripts + sign-off sheet** (see template below) handed to the client with expected results and a pass/fail column.
- [ ] **E7 — Known-issues list + support contact** for testers (what's in/out of scope, who to ping).

---

## P2 — Hardening / cleanup (before production, fine to note for UAT)

- [ ] **S1 — Lock down public API routes.** `src/middleware.ts` marks `/api/drivers`, `/api/patients`, `/api/hospitals`, `/api/transport-companies`, `/api/erteam`, `/api/seed` and a `?test=true` bypass on `/api/transport/*` as **public (no auth)** — patient/driver PII is world-readable. Acceptable only in a closed UAT; must be closed for prod.
- [ ] **S2 — Remove/guard seed + debug endpoints** (`/api/seed/*`, `/api/debug/*`, `/test-*` pages) from any internet-facing build.
- [ ] **S3 — Keys hygiene.** `.env` contains **LIVE** Clerk keys alongside test; ensure UAT/CI never ships live keys and the seed scripts refuse non-test keys (they already do).
- [ ] **S4 — Refresh stale docs** `DATABASE_SCHEMA_DOCUMENTATION.md` + `API_AND_WORKFLOW_DOCUMENTATION.md` to match the real `sos_requests` schema (they describe tables/columns that don't exist).
- [ ] **S5 — Headless integration tests.** Protected API routes need a Clerk session token to test automatically; add `@clerk/testing` token minting so CI can exercise the real endpoints (not just the DB).

---

## Test accounts (Clerk TEST → `/sign-in`, password `Triqare-Test-2026!Xq`)
`admin@test.com` · `ert@test.com` · `company@test.com` · `driver1–3@test.com` · `patient1–3@test.com`
Rebuild anytime with `npm run seed:test` (5 roles) or `npm run test:scenarios` (full pool + lifecycle checks).

---

## Per-role UAT script template (hand to client)

| # | Role | Step | Expected result | Pass/Fail |
|---|------|------|-----------------|-----------|
| 1 | Patient | Sign in, tap SOS, share location | SOS created, status "SOS Triggered", appears on ERT dashboard with location | |
| 2 | ERT | See new SOS, assign nearest driver | Driver shows on the request, status → "Driver En Route", driver marked busy | |
| 3 | Driver | Receive assignment, accept, update status | Status advances En Route → Transport Arrived → User Picked Up → Arrived at Hospital | |
| 4 | Patient | Watch live status | Each status change reflects in near-real-time + alert | |
| 5 | ERT | Reassign to another driver mid-trip | Old driver freed, new driver shown, trip continues | |
| 6 | Patient | Trigger then cancel | Status "Cancelled", any assigned driver freed | |
| 7 | Transport co. | View own drivers + their assignments | Only own fleet, correct busy/available status | |
| 8 | Admin | User mgmt, hospitals, reports | CRUD works, stats render | |

---

_Bottom line: the SOS flow is now **flow-correct through the real app** — P0 (B1–B5) fixed and verified end-to-end (20/20 real-API + 6/6 DB scenarios). Remaining before client UAT: stand up the hosted UAT env + mobile builds (E1–E5), prepare the test scripts (E6–E7). P2/S1–S3 are production-hardening (intentionally deferred — locking the public routes / removing seed endpoints now would hamper UAT testing)._
