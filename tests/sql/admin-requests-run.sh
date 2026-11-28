#!/bin/bash
# Admin requests (受付簿・利用停止・操作記録) SQL scenarios on a local throwaway Postgres (PG* env vars).
set -e
set -o pipefail
cd "$(dirname "$0")/../.."
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists ao_artest" -c "create database ao_artest"
psql -q -v ON_ERROR_STOP=1 -d ao_artest -f tests/sql/admin-requests-stub.sql
psql -q -v ON_ERROR_STOP=1 -d ao_artest -f supabase/migrations/20261128150000_post_log.sql > /dev/null
psql -q -v ON_ERROR_STOP=1 -d ao_artest -f supabase/migrations/20261128170000_admin_requests.sql > /dev/null
psql -q -v ON_ERROR_STOP=1 -d ao_artest -f supabase/migrations/20261128170000_admin_requests.sql > /dev/null   # runs twice cleanly
psql -q -t -A -v ON_ERROR_STOP=1 -d ao_artest -f tests/sql/admin_requests.sql 2>&1 | grep -v "^$" | sed "s/^psql:[^ ]* //"
psql -q -c "drop database ao_artest"
echo "admin requests sql tests passed"
