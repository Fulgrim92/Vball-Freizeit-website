#!/usr/bin/env bash
# Applies the Supabase migrations and seed to a throwaway local Postgres (15+) and runs the
# RLS tests. Needs initdb, pg_ctl and psql on PATH (or PG_BIN set); must not run as root.
#
#   npm run test:db
#   npm run test:db -- --demo-results   seed with simulated results, to check they all validate
set -euo pipefail
cd "$(dirname "$0")/.."
PG_BIN=${PG_BIN:-$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")}
DIR=$(mktemp -d)
PORT=${PGPORT_TEST:-54399}
trap '"$PG_BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

"$PG_BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"$PG_BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
psql() { command psql -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

psql -c 'set client_min_messages = error' -f supabase/tests/supabase_stub.sql 2>&1 | grep -v wal_level || true
for f in supabase/migrations/*.sql; do psql -f "$f"; done
echo "migrations applied"
if [[ "${1:-}" == "--demo-results" ]]; then
  node scripts/gen-seed.mjs --demo-results --out "$DIR/seed.sql" >/dev/null
  psql -f "$DIR/seed.sql"
  echo "seed with demo results: $(psql -tA -c 'select count(*) from matches where sets is not null') results valid"
else
  psql -f supabase/seed.sql
  echo "seed applied"
fi
psql -o /dev/null -f supabase/tests/rls_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
