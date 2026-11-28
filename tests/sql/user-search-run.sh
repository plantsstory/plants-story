#!/bin/bash
# Admin user search SQL scenarios on a local throwaway Postgres (PG* env vars, e.g. PGHOST=/path/sock PGPORT=5544 PGUSER=postgres).
set -e
set -o pipefail
cd "$(dirname "$0")/../.."
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists ao_ustest" -c "create database ao_ustest"
psql -q -v ON_ERROR_STOP=1 -d ao_ustest -f tests/sql/user-search-stub.sql
psql -q -v ON_ERROR_STOP=1 -d ao_ustest -f supabase/migrations/20261128160000_admin_user_search.sql > /dev/null
psql -q -t -A -v ON_ERROR_STOP=1 -d ao_ustest -f tests/sql/user_search.sql 2>&1 | grep -v "^$" | sed "s/^psql:[^ ]* //"
psql -q -c "drop database ao_ustest"
echo "user search sql tests passed"
