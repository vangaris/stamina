#!/usr/bin/env bash
# Reads `aws s3api list-objects-v2 --output json` on stdin, prints the key of the newest backup
# (by LastModified, ties broken by key). Exits 1 when the bucket holds no backup.
set -euo pipefail

key="$(jq -r '
  def epoch: sub("\\.[0-9]+"; "") | sub("\\+00:00$"; "Z") | fromdateiso8601;
  (.Contents // [])
  | map(select(.Key | test("^stamina-[0-9]{8}T[0-9]{6}Z\\.dump\\.age$"))
        | . + {t: (.LastModified | epoch)})
  | sort_by([.t, .Key])
  | last
  | .Key // empty
')"

if [ -z "$key" ]; then
  echo "backup-latest: no backup found" >&2
  exit 1
fi
echo "$key"
