#!/usr/bin/env bash
# Writes an encrypted logical backup of $DATABASE_URL and prints the file path.
#   pg_dump (custom format, compressed) | age -r $BACKUP_AGE_PUBLIC_KEY -> <dir>/stamina-<UTC>.dump.age
# Plaintext never touches disk: pg_dump streams straight into age. --no-owner/--no-acl keep the
# dump restorable into any Postgres without the original roles.
# Use the DIRECT connection string (not the pooled one): pg_dump does not work through pgbouncer.
#
# Usage: backup-create.sh [output-dir]   (default: current directory)
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_AGE_PUBLIC_KEY:?BACKUP_AGE_PUBLIC_KEY is required}"

dir="${1:-.}"
mkdir -p "$dir"
name="stamina-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
partial="$dir/$name.partial"
trap 'rm -f "$partial"' EXIT

pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" \
  | age --recipient "$BACKUP_AGE_PUBLIC_KEY" --output "$partial"

if [ ! -s "$partial" ]; then
  echo "backup-create: output is empty" >&2
  exit 1
fi
mv "$partial" "$dir/$name"
echo "$dir/$name"
