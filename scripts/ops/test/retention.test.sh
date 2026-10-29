#!/usr/bin/env bash
# Canned-JSON tests for backup-retention.sh and backup-latest.sh. No network, no services.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ops="$here/.."
now=$(date -u -d '2026-11-30T02:30:00Z' +%s 2> /dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' '2026-11-30T02:30:00Z' +%s)
failures=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then
    echo "ok   $1"
  else
    echo "FAIL $1"
    echo "  expected: $(printf '%s' "$2" | tr '\n' ' ')"
    echo "  actual:   $(printf '%s' "$3" | tr '\n' ' ')"
    failures=$((failures + 1))
  fi
}

prune() { RETENTION_NOW_EPOCH="$now" "$ops/backup-retention.sh"; }

# now = 2026-11-30T02:30:00Z, so exactly 30 days ago = 2026-10-31T02:30:00Z
json='{"Contents":[
  {"Key":"stamina-20261001T023000Z.dump.age","LastModified":"2026-10-01T02:30:05.000Z"},
  {"Key":"stamina-20261030T023000Z.dump.age","LastModified":"2026-10-30T02:30:00.000Z"},
  {"Key":"stamina-20261031T023000Z.dump.age","LastModified":"2026-10-31T02:30:00.000Z"},
  {"Key":"stamina-20261031T023001Z.dump.age","LastModified":"2026-10-31T02:30:01+00:00"},
  {"Key":"stamina-20261129T023000Z.dump.age","LastModified":"2026-11-29T02:30:00.000Z"},
  {"Key":"notes.txt","LastModified":"2020-01-01T00:00:00.000Z"},
  {"Key":"stamina-20261031T023000Z.dump.age.partial","LastModified":"2020-01-01T00:00:00.000Z"}
]}'

check "expires >30 days, keeps exactly 30 days and newer, ignores foreign keys" \
  $'stamina-20261001T023000Z.dump.age\nstamina-20261030T023000Z.dump.age' \
  "$(printf '%s' "$json" | prune)"

check "one second past the boundary is expired" \
  "stamina-20261031T023000Z.dump.age" \
  "$(printf '%s' '{"Contents":[
    {"Key":"stamina-20261031T023000Z.dump.age","LastModified":"2026-10-31T02:29:59.000Z"},
    {"Key":"stamina-20261129T023000Z.dump.age","LastModified":"2026-11-29T02:30:00.000Z"}]}' | prune)"

check "exactly 30 days old is kept" "" \
  "$(printf '%s' '{"Contents":[
    {"Key":"stamina-20261031T023000Z.dump.age","LastModified":"2026-10-31T02:30:00.000Z"},
    {"Key":"stamina-20261129T023000Z.dump.age","LastModified":"2026-11-29T02:30:00.000Z"}]}' | prune)"

check "the newest backup is never expired, even when stale" \
  $'stamina-20260101T023000Z.dump.age\nstamina-20260102T023000Z.dump.age' \
  "$(printf '%s' '{"Contents":[
    {"Key":"stamina-20260101T023000Z.dump.age","LastModified":"2026-01-01T02:30:00.000Z"},
    {"Key":"stamina-20260102T023000Z.dump.age","LastModified":"2026-01-02T02:30:00.000Z"},
    {"Key":"stamina-20260103T023000Z.dump.age","LastModified":"2026-01-03T02:30:00.000Z"}]}' | prune)"

check "stale-only bucket expires all but the newest" "2" \
  "$(printf '%s' '{"Contents":[
    {"Key":"stamina-20260101T023000Z.dump.age","LastModified":"2026-01-01T02:30:00.000Z"},
    {"Key":"stamina-20260102T023000Z.dump.age","LastModified":"2026-01-02T02:30:00.000Z"},
    {"Key":"stamina-20260103T023000Z.dump.age","LastModified":"2026-01-03T02:30:00.000Z"}]}' | prune | wc -l | tr -d ' ')"

check "empty bucket (no Contents)" "" "$(printf '%s' '{}' | prune)"
check "no output at all from aws" "" "$(printf '' | prune)"

check "latest picks the newest LastModified" "stamina-20261129T023000Z.dump.age" \
  "$(printf '%s' "$json" | "$ops/backup-latest.sh")"

if printf '%s' '{}' | "$ops/backup-latest.sh" 2> /dev/null; then
  check "latest on an empty bucket exits non-zero" "nonzero" "zero"
else
  check "latest on an empty bucket exits non-zero" "nonzero" "nonzero"
fi

if [ "$failures" -ne 0 ]; then
  echo "$failures retention test(s) failed"
  exit 1
fi
echo "retention tests passed"
