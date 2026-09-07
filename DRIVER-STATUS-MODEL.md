# Driver status model — definitions, defects, and the four we should keep

Live snapshot: **6 Sep 2026**, read from production (26 driver records).

---

## TL;DR

1. **The drivers are right.** 17 of 26 have gone on duty in the app and the database has stored that correctly. 12 of them are genuinely reachable by dispatch right now.
2. **Admin and Transport show 1.** Not because of a counting bug — because the database function they call to check reachability *does not exist on live*. It was written 3 Sep and never applied. Every call errors, and the code (correctly) refuses to guess, so 16 drivers render as "Duty unknown" instead of "On Duty".
3. **11 statuses on screen, 13 in the code, 3 conflicting rules.** The same driver is "Stale" on ER Team, "Duty unknown" on Admin, and "Available" on the Admin driver list — simultaneously.
4. **Proposal: four states, one function, every screen.** On Trip · On Duty · Needs Attention · Off Duty.

---

## Part 1 — Why the metrics are wrong

### Fault A — the reachability check does not exist on production *(blocker, ~5 min fix)*

Every dashboard asks the database "which of these drivers have a device we can push an SOS to?" via `driver_push_reachability`. On live:

```
Could not find the function public.driver_push_reachability(user_ids)
in the schema cache
```

`migrations/99_updates/driver_push_reachability.sql` exists in the repo, is idempotent, and was never applied. `fetchPushReachability()` returns `null` on failure — deliberately *not* an empty set — so presence resolves to `unknown` → **"Duty unknown"**, not dispatchable.

Effect on the Admin dashboard right now: **On Duty Now = 1**, with a footnote "16 unchecked — reachability lookup failed". Truth is 12.

This also hides a real operational fault: **5 drivers are on duty with no active push device.** They think they are working; an SOS push has nowhere to land. Nobody can see them today.

### Fault B — "Online" measures the app being open, not the driver being available *(design)*

`online` requires a GPS position in the last 10 minutes. That position comes from `Location.watchPositionAsync` in `app/(driver)/index.tsx`, which is **foreground-only** — it stops the moment a driver pockets the phone, which is what a working driver does.

Freshest GPS position anywhere in the fleet: **235 minutes old (3h 55m)**. So `online = 0`, permanently, and will stay 0 until background location tracking ships. Any tile leading with "Online" is answering a question nobody asked.

### Fault C — the same word means different things on different screens *(vocabulary)*

| Contradiction | Where |
|---|---|
| **"Busy" = 9** (every driver *not* `available` — i.e. 9 **signed-out** drivers counted as busy) | `api/erteam/dashboard/stats` |
| **"Busy (SOS)" = 1** (actually holding a live SOS) | ER Team driver list |
| **"On Trip" = 0** (raw `status='on_trip'`) | Admin driver list |
| **"On Trip" = 1** (also counts `current_request_id`) | Admin dashboard |
| A row showing `Stale` **and** `available` as two badges side by side | ER Team driver list, lines 525 + 528 |

---

## Part 2 — Definition of every status in use today

Counts are live as of this morning. Eleven are visible to staff; two more exist in the code and can surface at any time.

| Status | Where it appears | What actually decides it | Live | Verdict |
|---|---|---|---:|---|
| **Online** | Admin dashboard, ER Team tile + filter | `status='available'` AND a GPS ping in the last 10 min | 0 | Demote to a detail line |
| **Available** | Admin + Transport driver lists (tile, badge, filter) | `drivers.status='available'` — raw, unchecked | 17 | Retire |
| **On Trip** | Admin dashboard, Admin + Transport lists | List: `status='on_trip'`. Dashboards: also `current_request_id` set | 0 / 1 | **Keep** — one rule |
| **Assigned** | Admin + Transport driver lists | `drivers.status='assigned'` | 0 | Merge into On Trip |
| **Verified** | Admin tile, both lists, ER Team detail | `drivers.is_verified` — a paperwork flag | 26 | **Not a status** |
| **On Duty** | Admin + Transport badges (label for `stale`) | `status='available'`, reachable, but no recent GPS | 0 | **Keep the name** |
| **On Duty (no signal)** | ER Team tile + filter | The same rule as "On Duty", worded differently | 16 | Retire — duplicate |
| **Stale** | ER Team row badge (internal word shown to staff) | The same rule again, third wording | 16 | Retire — duplicate |
| **Busy (SOS)** | ER Team tile, filter, badge | List: holding a live SOS. Dashboard: `status != 'available'` | 1 / 9 | Merge into On Trip |
| **Offline** | ER Team tile, filter, badge | Signed out — and also absorbs unreachable drivers | 9 | Rename **Off Duty** |
| **Inactive** | Admin + Transport driver lists | `drivers.status='inactive'` — same thing as Offline | 9 | Retire — duplicate |
| **No app signal** | Code only; can appear on any badge | On duty but no push device registered | 5 | → Needs Attention |
| **Duty unknown** | Code only — **showing on Admin right now** | The reachability lookup failed | 16 | → Needs Attention |

---

## Part 3 — Proposal: four states, one rule, every screen

The test for each: *can dispatch send this driver an SOS in the next 60 seconds, and if not, whose problem is it?*

### 🔵 On Trip — **1**
Holding a live emergency. Not available for a new one.
```
current_request_id is set  OR  status in ('assigned','on_trip')
```
*Replaces:* On Trip, Assigned, Busy (SOS).

### 🟢 On Duty — **11**
Went on duty in the app **and** has a live device an SOS will land on. **This is the number that answers "how much cover do we have?"**
```
status = 'available'  AND  an active device_tokens row
```
*Replaces:* Available, Online, On Duty (no signal), Stale.

### 🔴 Needs Attention — **5**
The driver believes they are on duty. Dispatch cannot reach them. A work queue, not a presence state — someone should call them.
```
status = 'available'  AND  no active device (or the check failed)
```
*Replaces:* No app signal, Duty unknown.

### ⚪ Off Duty — **9**
Went off duty or signed out. Not expected to answer.
```
status = 'inactive'  OR  no driver record
```
*Replaces:* Offline, Inactive.

### Two things stop being statuses

- **Verified** is paperwork, not availability → its own column and filter. "Verified: 26" must never again sit in a row of presence tiles.
- **Live GPS** becomes a detail line under On Duty ("3 of 11 sending live location"), not a headline — because until background tracking ships it reads zero.

---

## Part 4 — Unified vocabulary: driver, staff, patient

Today the driver's phone shows a green dot and **"GO OFFLINE"**, while the dashboard describing that same driver says "Stale", "Duty unknown" or "Available" depending on which screen you opened. That gap *is* the complaint.

| Who | Sees today | Should see |
|---|---|---|
| **Driver (app)** | Green dot · "GO ONLINE" / "GO OFFLINE" | Pill reads **On Duty** / **Off Duty**; button reads "Go off duty". Red banner when **Needs Attention**, telling them notifications are off. |
| **Admin / ER Team** | 11 words, 3 rules, 3 answers | The same four states, from the same function, on every tile, badge and filter. |
| **Transport company** | Available / On Trip / Inactive | The same four, scoped to their own fleet, so their numbers reconcile with Admin's. |
| **Patient** | The 7 SOS stages — already consistent | **Unchanged.** Patients see the *request's* journey, never a driver's duty state. The two vocabularies stay separate on purpose. |

All four surfaces read from one file — `src/lib/driverPresence.ts` — with the mobile app mirroring its four labels. Any screen that hand-rolls its own count is a bug, not a variation.

---

## Part 5 — Order of work for next week

Step 1 makes today's numbers correct without touching a line of application code, so the fleet is visible again on Monday. Everything after that is the simplification.

| # | Work | Effort | Notes |
|---|---|---|---|
| 1 | **Apply `driver_push_reachability.sql` to live** | ~5 min | **Blocker.** Already written, idempotent, reviewed. "On Duty Now" goes 1 → 12 immediately; the 5 unreachable drivers become visible for the first time. |
| 2 | Collapse `driverPresence.ts` to four states | ½ day | Return exactly `on_trip`, `on_duty`, `needs_attention`, `off_duty`. Keep `online` internally as a *flag* on On Duty, not a state. |
| 3 | Repoint every screen at it | 1 day | Admin dashboard, Admin driver list, ER Team dashboard, ER Team driver list, Transport dashboard, Transport driver list. Two specific repairs: the ER Team dashboard's `busy = not available` query, and the ER Team row's duplicate raw badge. |
| 4 | Move **Verified** out of the status row | 1 hr | Own column, own filter, both driver lists. |
| 5 | Match the driver app's wording | ½ day + build | On Duty / Off Duty pill + "notifications are off" warning. Needs an APK/TestFlight build, so it lands a few days behind the dashboards — acceptable, since the dashboards are the complaint. |
| 6 | Fix the location heartbeat (background tracking) | 2–3 days | Follow-up. Makes "sending live location" meaningful and the map trustworthy. The only item that genuinely belongs in a later sprint; everything above is independent of it. |

---

*Figures read live from production 6 Sep 2026: 26 driver records, 17 with `status='available'`, 17 with an active push device (12 of them among the 17 available), freshest GPS position 235 minutes old, 26/26 verified. Derivations traced from `src/lib/driverPresence.ts`, `src/lib/driverReachability.ts`, `src/services/driverService.ts`, `src/services/sosService.ts` and the six dashboard routes.*
