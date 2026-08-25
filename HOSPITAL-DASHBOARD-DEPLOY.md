# QSoS Hospital Dashboard — deployment runbook

Built on branch `hospital-dashboard`. **Nothing is live until the migration is
applied by hand** (see step 2): this Supabase project exposes no `exec_sql` RPC,
verified by `scripts/_hospital-preflight.js`, so there is no self-applying path.

Portal: `https://portal.triqare.com/hospital` (base path configurable, OQ-003).

---

## 1. Pre-flight (read-only, safe to run any time)

```bash
cd web-production
node scripts/_hospital-preflight.js
```

Re-run this after step 2 as the verification pass. Before the migration it should
report the six `hospital_*` tables as absent; afterwards, present.

## 2. Apply the migration  ← blocking, do this first

Paste `migrations/99_updates/hospital_dashboard.sql` into the Supabase SQL editor
and run it. It is idempotent and ends with a verification SELECT that should print:

| check | value |
|---|---|
| tables | 6 |
| rls enabled | 6 |
| policies | 4 |
| realtime tables | 3 |
| backfilled registrations | ~72 |
| config keys | 4 |

The backfill matters: 204 hospitals and ~72 live patient preferences already
exist, and without it every dashboard opens empty and only fills for patients who
happen to edit their preferences after go-live.

To rehearse it first, `migrations/tests/hospital_dashboard/run.sh` applies it
twice to a throwaway Postgres whose fixture reproduces the live column set, then
runs 43 assertions covering every user story, cross-hospital isolation, and
idempotency. Requires Docker.

## 3. Environment variables (Netlify UI)

| Variable | Needed for | If unset |
|---|---|---|
| `RESEND_API_KEY` | onboarding email | Already set. Account still provisions; the email is skipped and the UI says so. |
| `GOOGLE_MAPS_SERVER_API_KEY` | live ETA (US-008) | **New.** Falls back to the public key, which is HTTP-referrer restricted and will be rejected server-side, so ETA reads "ETA unavailable". Create an IP-restricted key with the Directions API enabled. |
| `NEXT_PUBLIC_HOSPITAL_PORTAL_PATH` | portal URL in the email (OQ-003) | Defaults to `/hospital`. |
| `NEXT_PUBLIC_APP_URL` | portal URL in the email | Already set. **If it is stale, every onboarding email ships a dead link.** |

Set these *before* deploying, or the first onboarding emails go out with bad links.

## 4. Deploy

Push `hospital-dashboard` to `triqare-coder` and merge to `main`. Netlify builds
from that branch. No mobile release is required for any part of this feature.

## 5. Smoke test on live

1. Admin → Hospitals → Add, fill in **Admin Email Address** and **Hospital Type
   (QSOS)**. Save.
2. Onboarding email arrives within 2 minutes. Check the login URL, temporary
   password and the "Set Up My Dashboard" button.
3. Click through → set a password (8+, uppercase, number, special) → lands on
   `<Hospital name> — QSOS Hospital Dashboard`.
4. Open the same link again → "This setup link has expired" (single-use).
5. Hospital record → **Re-send Onboarding Email** → fresh link works, the old one
   does not.
6. On a test patient in the QSoS app, select the hospital as primary → the tile
   increments and the row appears without a refresh.
7. Raise an SOS → red beacon and audible alert on **both** primary and secondary,
   both PENDING.
8. In the driver app, pick the primary hospital → primary flips to CONFIRMED
   INCOMING with a live ETA, secondary shows the cancellation notice.
   Repeat picking the secondary, and picking a Google (non-QSoS) hospital — the
   last must show "Patient is being taken to the nearest available facility" on
   both, and log as `Nearest Hospital (Off-Platform)` with a blank ETA.
9. Complete the trip → the confirmed hospital's history row reads ADMITTED.
10. Admission History → filter by date range → **Export CSV** → the file matches
    the filtered set.

## 6. Isolation check (the security NFR — do not skip)

Client-side guards prove nothing. Provision two hospitals, sign in as A, take the
access token from the browser (Application → Local Storage → `sb-*-auth-token`),
and query B's rows directly:

```bash
curl -s "$SUPABASE_URL/rest/v1/hospital_patient_registrations?hospital_id=eq.<B_ID>" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer <A_ACCESS_TOKEN>"
# must return []
```

`[]` is the pass. Anything else means RLS did not apply and the deploy should be
rolled back. This is the same Bearer-token REST technique that proved the
2026-07-29 RLS outage.

---

## Known gaps and deliberate omissions

- **Patient profile fields are mostly empty until the mobile app catches up.**
  The columns exist and the dashboard renders every spec'd section, but the QSoS
  app only captures blood group, ABHA and one free-text allergies field, plus
  three insurance fields. Known conditions, medications, organ-donor status,
  disability flags, split allergies and the four extra insurance fields render as
  "Not provided" until mobile capture ships. No further migration will be needed
  when it does.
- **Account deletion still destroys `sos_requests` platform-wide.** Deleting a
  patient hard-deletes `users`, cascading to `patients` and `sos_requests`. The
  hospital's own admission history is immune by design (snapshots, no cascading
  FK), but the patient's SOS history is still lost for every other consumer. Out
  of scope here; worth fixing separately.
- **RLS on the core tables is still off** and anon can still read
  `users`/`patients`/`sos_requests`/`hospitals`. This build deliberately does not
  touch it — that cutover has its own outage history and ~75 open anon-key call
  sites. The `hospital_*` tables are locked down independently.
- **Two pre-existing eslint errors** in `admin/hospitals/[id]/page.tsx`
  (unescaped quotes, line 272) are untouched — they predate this work.
- **OQ-002 (bed "Prepared")** is not built. `hospital_sos_alerts.bed_prepared_at`
  exists unused so it can be turned on without a migration.
- **OQ-001** defaults to `REMAIN_PENDING` via the
  `hospital_sos_driver_offline_policy` config key; the alternative is
  `TIMEOUT_TO_PRIMARY`, which would need a sweep job.
