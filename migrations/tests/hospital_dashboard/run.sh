#!/usr/bin/env bash
# Offline test harness for migrations/99_updates/hospital_dashboard.sql.
#
# This project has no exec_sql RPC, so the migration is applied by hand in the
# Supabase SQL editor -- there is no staging DB and no dry run. This harness is
# the substitute: a throwaway Postgres whose fixture reproduces the column set
# MEASURED on live by scripts/_hospital-preflight.js (notably: sos_requests has
# no created_at / destination_hospital_id / estimated_arrival_time, and
# status_history is a jsonb string scalar).
#
#   ./migrations/tests/hospital_dashboard/run.sh
#
# Requires Docker. Exits non-zero on the first failed assertion.
set -euo pipefail
cd "$(dirname "$0")/../../.."
C=triqare-pgtest-hospital
HERE=migrations/tests/hospital_dashboard

docker rm -f $C >/dev/null 2>&1 || true
docker run -d --name $C -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do docker exec $C pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done

for f in "$HERE/00_fixture.sql" migrations/99_updates/hospital_dashboard.sql \
         "$HERE/01_lifecycle.sql" "$HERE/02_isolation.sql" "$HERE/03_scenarios.sql"; do
  docker cp "$f" $C:/tmp/ >/dev/null
done

docker exec $C psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/00_fixture.sql >/dev/null 2>&1
echo "fixture ready"
docker exec $C psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/hospital_dashboard.sql >/dev/null 2>&1
echo "migration applied"
# Applied twice: every 99_updates file must be safe to re-run.
docker exec $C psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/hospital_dashboard.sql >/dev/null 2>&1
echo "migration re-applied (idempotent)"

# Assertions raise, so psql's exit status matters -- but so does the output,
# because a raised EXCEPTION inside a DO block still prints ERROR. Both are
# checked: an earlier version piped straight to grep and reported success while
# an assertion was failing in plain sight.
failed=0
for f in 01_lifecycle 02_isolation 03_scenarios; do
  out=$(docker exec $C psql -U postgres -q -v ON_ERROR_STOP=1 -f /tmp/$f.sql 2>&1) || failed=1
  echo "$out" | grep -E "PASS|FAIL|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //' || true
  if echo "$out" | grep -qE "FAIL|ERROR"; then failed=1; fi
done

docker rm -f $C >/dev/null
if [ "$failed" -ne 0 ]; then
  echo "--- hospital_dashboard.sql: ASSERTIONS FAILED ---" >&2
  exit 1
fi
echo "--- hospital_dashboard.sql: all assertions passed ---"
