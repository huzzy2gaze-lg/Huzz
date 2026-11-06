#!/usr/bin/env bash
# Runs the migration and the access-rule tests on a fresh local Postgres database.
# Usage: ./run.sh   (needs psql and a local Postgres; runs as the postgres user)
set -euo pipefail
cd "$(dirname "$0")"
DB=orchard_test
PSQL="psql -X -q -v ON_ERROR_STOP=1"
run(){ if [ "$(id -un)" = postgres ]; then $PSQL "$@"; else su postgres -c "$PSQL $(printf '%q ' "$@")"; fi; }
run -d postgres -c "drop database if exists $DB" -c "create database $DB"
run -d $DB -f "$PWD/fake_auth.sql"
for f in "$PWD"/../migrations/*.sql; do run -d $DB -f "$f"; done
run -d $DB -f "$PWD/../seed/initial_data.sql"
run -d $DB -o /dev/null -f "$PWD/access_test.sql"
run -d $DB -o /dev/null -f "$PWD/phase2_test.sql"
run -d $DB -o /dev/null -f "$PWD/phase3_test.sql"
run -d $DB -o /dev/null -f "$PWD/phase4_test.sql"
echo "All database tests passed."
