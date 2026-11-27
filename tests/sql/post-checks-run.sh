#!/bin/bash
# Post check SQL scenarios on a local throwaway Postgres (PG* env vars, e.g. PGHOST=/path/sock PGPORT=5544 PGUSER=postgres).
set -e
cd "$(dirname "$0")/../.."
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists ao_pctest" -c "create database ao_pctest"
psql -q -v ON_ERROR_STOP=1 -d ao_pctest -f tests/sql/post-checks-stub.sql
psql -q -v ON_ERROR_STOP=1 -d ao_pctest -f supabase/migrations/20261127140000_post_checks.sql > /dev/null
psql -q -t -A -v ON_ERROR_STOP=1 -d ao_pctest -f tests/sql/post_checks.sql 2>&1 | grep -v "^$" | sed "s/^psql:[^ ]* //"
psql -q -c "drop database ao_pctest"
echo "post-check sql tests passed"
