#!/usr/bin/env bash
# Local end-to-end smoke test of the backup/restore scripts against a throwaway embedded
# Postgres (the same one the API tests use). No network, no real R2/Neon, no secrets.
#   scripts/ops/test/smoke.sh        (needs: node, pnpm install done, age, jq, pg_dump/pg_restore/psql)
# SMOKE_DB_PORT overrides the port (default 54391).
# shellcheck disable=SC2016,SC2034  # check() evals single-quoted conditions that read these variables
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ops="$here/.."
root="$(cd "$ops/../.." && pwd)"
port="${SMOKE_DB_PORT:-54391}"

# On a Mac the libpq tools are keg-only.
for d in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin; do
  [ -d "$d" ] && PATH="$d:$PATH"
done
export PATH
for tool in age age-keygen jq node pnpm pg_dump pg_restore psql strings; do
  command -v "$tool" > /dev/null || { echo "smoke: missing tool: $tool" >&2; exit 2; }
done

work="$(mktemp -d)"
pg_pid=""
cleanup() {
  [ -n "$pg_pid" ] && kill "$pg_pid" 2> /dev/null && wait "$pg_pid" 2> /dev/null || true
  rm -rf "$work"
}
trap cleanup EXIT

failures=0
pass() { echo "ok   $1"; }
fail() { echo "FAIL $1"; failures=$((failures + 1)); }
check() { # name, shell condition evaluated now (single-quoted so it sees the current variables)
  if eval "$2"; then pass "$1"; else fail "$1"; fi
}

marker="SMOKE_MARKER_$(date +%s)_synthetic"
src_url="postgres://stamina:stamina@127.0.0.1:$port/stamina"
admin_url="postgres://stamina:stamina@127.0.0.1:$port/scratch"
q() { psql "$1" --no-psqlrc -X -qAt -v ON_ERROR_STOP=1 -c "$2"; }

echo "== start embedded Postgres on :$port"
node "$here/pg-fixture.mjs" "$port" "$work/pgdata" "$work/ready" > "$work/pg.log" 2>&1 &
pg_pid=$!
for _ in $(seq 1 120); do
  [ -f "$work/ready" ] && break
  kill -0 "$pg_pid" 2> /dev/null || { cat "$work/pg.log" >&2; echo "smoke: Postgres died" >&2; exit 2; }
  sleep 1
done
[ -f "$work/ready" ] || { echo "smoke: Postgres did not start" >&2; exit 2; }

echo "== migrate and seed the source database"
(cd "$root" && DATABASE_URL="$src_url" pnpm --silent --filter @stamina/api db:migrate > /dev/null)
q "$src_url" "create table smoke_marker (note text not null); insert into smoke_marker values ('$marker')" > /dev/null

echo "== create an encrypted backup"
age-keygen -o "$work/key.txt" 2> /dev/null
public_key="$(age-keygen -y "$work/key.txt")"
private_key="$(grep '^AGE-SECRET-KEY-' "$work/key.txt")"
backup="$(DATABASE_URL="$src_url" BACKUP_AGE_PUBLIC_KEY="$public_key" "$ops/backup-create.sh" "$work/out")"
case "$(basename "$backup")" in
  stamina-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z.dump.age) pass "file name" ;;
  *) fail "file name: $(basename "$backup")" ;;
esac
check "backup is non-empty" '[ -s "$backup" ]'
check "no .partial file left behind" '! compgen -G "$work/out/*.partial" > /dev/null'

echo "== prove the file is encrypted"
pg_dump --format=custom --no-owner --no-acl --dbname="$src_url" --file="$work/plain.dump"
check "control: the plaintext dump shows table names to strings" 'strings "$work/plain.dump" | grep -q smoke_marker'
check "control: the plaintext dump shows function names to strings" 'strings "$work/plain.dump" | grep -q app_user_id'
if strings "$backup" | grep -Eq 'smoke_marker|app_user_id|__drizzle_migrations|CREATE|PGDMP'; then
  fail "encrypted file leaks plaintext"
else
  pass "encrypted file shows no SQL, table names or dump magic to strings"
fi
check "age header present" '[ "$(head -c 21 "$backup")" = "age-encryption.org/v1" ]'
rm -f "$work/plain.dump"

prepare() {
  ADMIN_DATABASE_URL="$admin_url" "$ops/restore-prepare.sh"
}

echo "== restore into a scratch database"
scratch_url="$(prepare)"
check "restore-prepare swaps the database name in the URL" '[ "$scratch_url" = "postgres://stamina:stamina@127.0.0.1:$port/restore_verify" ]'
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$private_key" "$ops/restore-verify.sh" "$backup")" && rc=0 || rc=$?
echo "     $out"
out_lines="$(printf '%s\n' "$out" | wc -l | tr -d ' ')"
restored="$(q "$scratch_url" "select count(*) from smoke_marker where note = '$marker'")" || restored=""
check "restore-verify passes with the right key" '[ "$rc" -eq 0 ] && [ "${out%% *}" = "RESULT=pass" ]'
check "restore-verify prints exactly one line" '[ "$out_lines" = "1" ]'
case "$out" in *"$marker"* | *postgres://*) fail "output leaks data or a connection string" ;; *) pass "output carries counts only" ;; esac
check "restored data is really there" '[ "$restored" = "1" ]'

echo "== failures are detected"
scratch_url="$(prepare)"
set +e
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$(age-keygen 2> /dev/null | grep '^AGE-SECRET-KEY-')" "$ops/restore-verify.sh" "$backup")"
rc=$?
set -e
echo "     $out"
check "wrong private key fails" '[ "$rc" -ne 0 ] && [ "${out%% *}" = "RESULT=fail" ]'

head -c "$(($(wc -c < "$backup") / 2))" "$backup" > "$work/truncated.dump.age"
scratch_url="$(prepare)"
set +e
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$private_key" "$ops/restore-verify.sh" "$work/truncated.dump.age")"
rc=$?
set -e
echo "     $out"
check "truncated file fails" '[ "$rc" -ne 0 ] && [ "${out%% *}" = "RESULT=fail" ]'

set +e
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$private_key" "$ops/restore-verify.sh" "$work/missing.dump.age")"
rc=$?
set -e
check "missing file fails" '[ "$rc" -ne 0 ] && [ "$out" = "RESULT=fail reason=missing_backup_file" ]'

scratch_url="$(prepare)"
q "$scratch_url" "create table leftover (id int)" > /dev/null
set +e
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$private_key" "$ops/restore-verify.sh" "$backup")"
rc=$?
set -e
echo "     $out"
check "non-empty scratch database is refused" '[ "$rc" -ne 0 ] && [ "${out%% *}" = "RESULT=fail" ]'

# A dump of a database without the drizzle migration table must not pass the sanity checks.
empty_backup="$(DATABASE_URL="$admin_url" BACKUP_AGE_PUBLIC_KEY="$public_key" "$ops/backup-create.sh" "$work/empty")"
scratch_url="$(prepare)"
set +e
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$private_key" "$ops/restore-verify.sh" "$empty_backup")"
rc=$?
set -e
echo "     $out"
check "dump without the migrations table fails the sanity check" '[ "$rc" -ne 0 ] && [ "$out" = "RESULT=fail reason=migrations_table_missing" ]'

echo "== backup-create fails loudly"
set +e
DATABASE_URL="postgres://stamina:stamina@127.0.0.1:1/none" BACKUP_AGE_PUBLIC_KEY="$public_key" \
  "$ops/backup-create.sh" "$work/bad" > /dev/null 2>&1
rc=$?
set -e
check "unreachable database exits non-zero" '[ "$rc" -ne 0 ]'
check "unreachable database leaves no file" '! compgen -G "$work/bad/*" > /dev/null'
set +e
DATABASE_URL="$src_url" BACKUP_AGE_PUBLIC_KEY="not-a-key" "$ops/backup-create.sh" "$work/bad" > /dev/null 2>&1
rc=$?
set -e
check "invalid age public key exits non-zero" '[ "$rc" -ne 0 ]'
check "invalid key leaves no file" '! compgen -G "$work/bad/*" > /dev/null'

echo "== upload, prune and fetch against a fake R2 (aws test double)"
fake="$work/r2"
mkdir -p "$fake/bkt"
age_file() { # file days: backdate the modification time
  touch -t "$(date -u -d "$2 days ago" +%Y%m%d%H%M.%S 2> /dev/null || date -u -v-"$2"d +%Y%m%d%H%M.%S)" "$1"
}
echo old > "$fake/bkt/stamina-20200101T000000Z.dump.age"
age_file "$fake/bkt/stamina-20200101T000000Z.dump.age" 40
echo recent > "$fake/bkt/stamina-20200102T000000Z.dump.age"
age_file "$fake/bkt/stamina-20200102T000000Z.dump.age" 29
echo keepme > "$fake/bkt/unrelated.txt"
age_file "$fake/bkt/unrelated.txt" 400
r2() { # run a script with the fake aws first on PATH and dummy R2 settings
  FAKE_R2_DIR="$fake" PATH="$here/fake-bin:$PATH" R2_ENDPOINT=https://example.invalid R2_BACKUP_BUCKET=bkt \
    R2_ACCESS_KEY_ID=x R2_SECRET_ACCESS_KEY=y "$@"
}
upload_out="$(r2 "$ops/backup-upload.sh" "$backup")"
echo "     $(printf '%s' "$upload_out" | tr '\n' ' ')"
check "upload prints key, bytes and one pruned object" '[ "$upload_out" = "key=$(basename "$backup")
bytes=$(wc -c < "$backup" | tr -d " ")
pruned=1" ]'
check "upload stored an identical copy" 'cmp -s "$backup" "$fake/bkt/$(basename "$backup")"'
check "backup older than 30 days was pruned" '[ ! -e "$fake/bkt/stamina-20200101T000000Z.dump.age" ]'
check "backup 29 days old and foreign keys were kept" '[ -e "$fake/bkt/stamina-20200102T000000Z.dump.age" ] && [ -e "$fake/bkt/unrelated.txt" ]'
fetched="$(r2 "$ops/restore-fetch.sh" "$work/fetched")"
check "fetch downloads the newest backup, byte for byte" '[ "$(basename "$fetched")" = "$(basename "$backup")" ] && cmp -s "$backup" "$fetched"'
scratch_url="$(prepare)"
out="$(SCRATCH_DATABASE_URL="$scratch_url" BACKUP_AGE_PRIVATE_KEY="$private_key" "$ops/restore-verify.sh" "$fetched")" && rc=0 || rc=$?
echo "     $out"
check "fetched backup restores and verifies" '[ "$rc" -eq 0 ] && [ "${out%% *}" = "RESULT=pass" ]'
rm -f "$fake/bkt/$(basename "$backup")"
r2 "$ops/restore-fetch.sh" "$work/stale" > /dev/null 2>&1 && rc=0 || rc=$?
check "fetch refuses a newest backup older than 30 hours" '[ "$rc" -ne 0 ]'
rm -f "$fake"/bkt/*
r2 "$ops/restore-fetch.sh" "$work/stale" > /dev/null 2>&1 && rc=0 || rc=$?
check "fetch fails on an empty bucket" '[ "$rc" -ne 0 ]'

echo "== retention rule"
check "retention.test.sh" '"$here/retention.test.sh" > "$work/retention.log" 2>&1'
grep FAIL "$work/retention.log" || true

if [ "$failures" -ne 0 ]; then
  echo "smoke: $failures check(s) failed"
  exit 1
fi
echo "smoke: all checks passed"
