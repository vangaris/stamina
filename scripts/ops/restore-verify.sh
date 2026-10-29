#!/usr/bin/env bash
# Decrypts a backup (streamed, plaintext never on disk), restores it into the EMPTY scratch
# database $SCRATCH_DATABASE_URL and sanity-checks the result.
#   needs: BACKUP_AGE_PRIVATE_KEY (the AGE-SECRET-KEY-1... line), SCRATCH_DATABASE_URL
# Prints exactly one machine-readable line, counts only, never data or connection strings:
#   RESULT=pass migrations=<n> tables=<n> app_user_id=1
#   RESULT=fail reason=<code> [...]
# Exit 0 only on pass. pg_restore/age/psql output is discarded: a failed COPY can echo row
# values, and backups hold health data.
#
# Usage: restore-verify.sh <backup-file>
set -uo pipefail

file="${1:-}"
: "${BACKUP_AGE_PRIVATE_KEY:=}"
: "${SCRATCH_DATABASE_URL:=}"

fail() {
  echo "RESULT=fail reason=$1${2:+ $2}"
  exit 1
}

[ -n "$file" ] && [ -f "$file" ] || fail missing_backup_file
[ -n "$BACKUP_AGE_PRIVATE_KEY" ] || fail missing_private_key
[ -n "$SCRATCH_DATABASE_URL" ] || fail missing_scratch_url

q() {
  psql "$SCRATCH_DATABASE_URL" --no-psqlrc -X -qAt -v ON_ERROR_STOP=1 -c "$1" 2> /dev/null
}

# The target must be empty: restoring over existing objects would hide a bad dump.
existing="$(q "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
    and n.nspname not like 'pg\\_temp\\_%'")" || fail scratch_unreachable
[ "$existing" = "0" ] || fail scratch_not_empty "objects=$existing"

age --decrypt --identity <(printf '%s\n' "$BACKUP_AGE_PRIVATE_KEY") "$file" 2> /dev/null \
  | pg_restore --no-owner --no-acl --exit-on-error --dbname="$SCRATCH_DATABASE_URL" > /dev/null 2>&1
codes=("${PIPESTATUS[@]}")
age_rc="${codes[0]}"
restore_rc="${codes[1]}"
[ "$age_rc" = "0" ] || fail decrypt_failed "age_exit=$age_rc restore_exit=$restore_rc"
[ "$restore_rc" = "0" ] || fail restore_failed "restore_exit=$restore_rc"

migrations="$(q "select count(*) from drizzle.__drizzle_migrations")" || fail migrations_table_missing
[ "$migrations" -gt 0 ] 2> /dev/null || fail no_migrations "migrations=$migrations"

fn="$(q "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'app_user_id'")" || fail function_check_failed
[ "$fn" = "1" ] || fail app_user_id_missing "app_user_id=$fn"

tables="$(q "select count(*) from pg_tables where schemaname = 'public'")" || fail table_count_failed

echo "RESULT=pass migrations=$migrations tables=$tables app_user_id=$fn"
