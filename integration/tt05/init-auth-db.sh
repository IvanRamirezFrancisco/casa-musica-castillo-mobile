#!/bin/sh
set -eu
# Matches the existing backend test profile. These are public synthetic test credentials, never production.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
CREATE ROLE auth_test LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD 'synthetic-test-only';
CREATE ROLE spring_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
-- Existing V11 migration grants this role to spring_app. Restricted to this isolated cluster.
GRANT pg_monitor TO auth_test WITH ADMIN OPTION;
CREATE DATABASE backend_hardening_test OWNER auth_test;
SQL
