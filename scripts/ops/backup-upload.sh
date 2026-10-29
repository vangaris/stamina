#!/usr/bin/env bash
# Uploads one backup file to the R2 bucket, verifies the stored size, then expires old backups
# (rule: backup-retention.sh). Prints key=, bytes= and pruned= lines (no secrets, no data).
#
# Usage: backup-upload.sh <file>
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
file="${1:?usage: backup-upload.sh <file>}"
# shellcheck source=scripts/ops/backup-r2-env.sh
. "$here/backup-r2-env.sh"

key="$(basename "$file")"
local_bytes="$(wc -c < "$file" | tr -d ' ')"

aws_r2 s3 cp "$file" "s3://$R2_BACKUP_BUCKET/$key" --only-show-errors
remote_bytes="$(aws_r2 s3api head-object --bucket "$R2_BACKUP_BUCKET" --key "$key" \
  --query ContentLength --output text)"
if [ "$remote_bytes" != "$local_bytes" ]; then
  echo "backup-upload: stored size $remote_bytes differs from local size $local_bytes" >&2
  exit 1
fi
echo "key=$key"
echo "bytes=$local_bytes"

expired="$(aws_r2 s3api list-objects-v2 --bucket "$R2_BACKUP_BUCKET" --output json \
  | "$here/backup-retention.sh")"
pruned=0
while IFS= read -r old; do
  [ -n "$old" ] || continue
  aws_r2 s3api delete-object --bucket "$R2_BACKUP_BUCKET" --key "$old" > /dev/null
  pruned=$((pruned + 1))
done <<< "$expired"
echo "pruned=$pruned"
