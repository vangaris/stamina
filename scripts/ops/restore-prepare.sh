#!/usr/bin/env bash
# Creates an EMPTY database named restore_verify next to the one $ADMIN_DATABASE_URL points at
# (dropping a leftover one first) and prints the connection string of the new database on stdout.
# Capture it (`SCRATCH_DATABASE_URL="$(restore-prepare.sh)"`), never echo it.
# Restoring into a fresh empty database means pg_restore cannot collide with whatever the parent
# Neon branch already contains.
set -euo pipefail

: "${ADMIN_DATABASE_URL:?ADMIN_DATABASE_URL is required}"
db=restore_verify

PGOPTIONS="-c client_min_messages=warning" psql "$ADMIN_DATABASE_URL" --no-psqlrc -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS $db" \
  -c "CREATE DATABASE $db" > /dev/null

# Swap the database name in the URL path, keep the query string (sslmode etc.).
printf '%s\n' "$ADMIN_DATABASE_URL" | sed -E "s#^([A-Za-z][A-Za-z0-9+.-]*://[^/]+)/[^?]*#\\1/$db#"
