#!/usr/bin/env bash
# The retention rule, in one place: backups older than RETENTION_DAYS are expired.
# Reads `aws s3api list-objects-v2 --output json` on stdin, prints the keys to delete, one per line.
#   - "older" is strictly more than RETENTION_DAYS (an object exactly 30 days old is kept)
#   - only keys named stamina-<UTC>.dump.age are ever considered
#   - the newest backup is never expired, so a stalled backup job cannot empty the bucket
# RETENTION_NOW_EPOCH overrides "now" (tests only).
set -euo pipefail

RETENTION_DAYS=30
now="${RETENTION_NOW_EPOCH:-$(date -u +%s)}"

jq -r --argjson now "$now" --argjson days "$RETENTION_DAYS" '
  def epoch: sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | fromdateiso8601;
  (.Contents // [])
  | map(select(.Key | test("^stamina-[0-9]{8}T[0-9]{6}Z\\.dump\\.age$"))
        | . + {t: (.LastModified | epoch)})
  | (max_by(.t).Key // null) as $newest
  | .[]
  | select(.t < $now - $days * 86400 and .Key != $newest)
  | .Key
'
