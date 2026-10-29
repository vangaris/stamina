#!/usr/bin/env bash
# Downloads the newest backup from the R2 bucket into <dir> and prints the file path.
# Fails when the newest backup is older than MAX_BACKUP_AGE_HOURS (default 30): an old dump that
# restores fine would otherwise hide a nightly job that silently stopped.
#
# Usage: restore-fetch.sh <dir>
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dir="${1:?usage: restore-fetch.sh <dir>}"
# shellcheck source=scripts/ops/backup-r2-env.sh
. "$here/backup-r2-env.sh"

mkdir -p "$dir"
key="$(aws_r2 s3api list-objects-v2 --bucket "$R2_BACKUP_BUCKET" --output json \
  | "$here/backup-latest.sh")"

# The UTC timestamp in the name is the backup time.
taken="$(jq -rn --arg k "$key" '$k | capture("^stamina-(?<t>[0-9]{8}T[0-9]{6}Z)").t | strptime("%Y%m%dT%H%M%SZ") | mktime')"
age_hours=$((($(date -u +%s) - taken) / 3600))
if [ "$age_hours" -gt "${MAX_BACKUP_AGE_HOURS:-30}" ]; then
  echo "restore-fetch: newest backup $key is $age_hours hours old" >&2
  exit 1
fi

aws_r2 s3 cp "s3://$R2_BACKUP_BUCKET/$key" "$dir/$key" --only-show-errors
echo "$dir/$key"
