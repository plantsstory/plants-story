#!/bin/bash
# Runs the SQL scenario tests on a local throwaway Postgres (connection from PG* env vars, e.g.
# PGHOST=/path/to/socket PGPORT=5544 PGUSER=postgres). Creates and drops the database ao_sqltest.
set -e
set -o pipefail 2>/dev/null || true
cd "$(dirname "$0")/../.."
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists ao_sqltest" -c "create database ao_sqltest"
psql -q -v ON_ERROR_STOP=1 -d ao_sqltest -f tests/sql/stub.sql
psql -q -v ON_ERROR_STOP=1 -d ao_sqltest -f supabase/migrations/20261127130000_origin_translations.sql
psql -q -t -A -v ON_ERROR_STOP=1 -d ao_sqltest -f tests/sql/origin_translations.sql 2>&1 | grep -v "^$" | sed "s/^psql:[^ ]* //"
psql -q -c "drop database ao_sqltest"
echo "sql tests passed"
