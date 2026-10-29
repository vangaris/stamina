#!/usr/bin/env bash
# Creates the EU-jurisdiction R2 bucket that holds OpenTofu state. It cannot be created by the
# configuration that stores its state in it, hence this script. Idempotent: an existing bucket is
# left alone. Run once, before the first `tofu init`.
#
#   TOFU_CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... infra/bootstrap.sh
#
# Reads ./.env (or the file named by ENV_FILE) when present. The token needs "Workers R2 Storage Write". Optional:
#   STATE_BUCKET             bucket name (default stamina-tfstate; keep in sync with versions.tf)
#   CLOUDFLARE_API_BASE      API root (default https://api.cloudflare.com/client/v4; tests point it at a mock)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-$root/.env}"
if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a
fi

: "${TOFU_CLOUDFLARE_API_TOKEN:?TOFU_CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
bucket="${STATE_BUCKET:-stamina-tfstate}"
base="${CLOUDFLARE_API_BASE:-https://api.cloudflare.com/client/v4}"
url="$base/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets"
out="$(mktemp)"
trap 'rm -f "$out"' EXIT

# cf METHOD URL [JSON_BODY] prints the HTTP status; the response body is left in $out. The token goes
# to curl on stdin, so it never appears in the process list.
cf() {
  local method="$1" target="$2" data="${3:-}" args=()
  args=(-sS -o "$out" -w '%{http_code}' -X "$method" -K - -H 'cf-r2-jurisdiction: eu')
  if [[ -n "$data" ]]; then
    args+=(-H 'content-type: application/json' --data "$data")
  fi
  printf 'header = "Authorization: Bearer %s"\n' "$TOFU_CLOUDFLARE_API_TOKEN" | curl "${args[@]}" "$target"
}

status="$(cf GET "$url/$bucket")"
case "$status" in
  200)
    echo "bucket $bucket already exists (eu jurisdiction): nothing to do"
    ;;
  404)
    status="$(cf POST "$url" "{\"name\":\"$bucket\"}")"
    if [[ "$status" != 200 ]]; then
      echo "creating bucket $bucket failed: HTTP $status" >&2
      cat "$out" >&2
      exit 1
    fi
    echo "created bucket $bucket in the eu jurisdiction"
    ;;
  *)
    echo "checking bucket $bucket failed: HTTP $status" >&2
    cat "$out" >&2
    exit 1
    ;;
esac

cat <<NEXT
Next:
  1. In the Cloudflare dashboard (R2 > Manage API tokens) create an R2 API token with
     "Object Read & Write" scoped to $bucket. Keep its Access Key ID and Secret Access Key as
     TF_STATE_R2_ACCESS_KEY_ID and TF_STATE_R2_SECRET_ACCESS_KEY in .env.
  2. infra/tofu.sh production init
NEXT
