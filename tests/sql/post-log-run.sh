#!/bin/bash
# Post log SQL scenarios on a local throwaway Postgres (PG* env vars, e.g. PGHOST=/path/sock PGPORT=5544 PGUSER=postgres).
set -e
set -o pipefail 2>/dev/null || true
cd "$(dirname "$0")/../.."
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists ao_pltest" -c "create database ao_pltest"
psql -q -v ON_ERROR_STOP=1 -d ao_pltest -f tests/sql/post-log-stub.sql
psql -q -v ON_ERROR_STOP=1 -d ao_pltest -f supabase/migrations/20261128150000_post_log.sql > /dev/null
psql -q -t -A -v ON_ERROR_STOP=1 -d ao_pltest -f tests/sql/post_log.sql 2>&1 | grep -v "^$" | sed "s/^psql:[^ ]* //"
psql -q -c "drop database ao_pltest"
echo "post-log sql tests passed"
