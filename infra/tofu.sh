#!/usr/bin/env bash
# Runs OpenTofu for one environment with the credentials wired from environment variables.
#
#   infra/tofu.sh production plan
#   infra/tofu.sh production apply
#
# Reads ./.env (gitignored, or the file named by ENV_FILE) when present, so a local run needs nothing but that file. CI exports the
# same names from repository secrets and variables. No secret is written to a file or printed.
#
# Required (docs/infra.md lists scopes and where each value comes from):
#   TOFU_CLOUDFLARE_API_TOKEN      Cloudflare token for Pages, R2 and DNS (read-only is enough for `plan`)
#   CLOUDFLARE_ACCOUNT_ID          Cloudflare account
#   NEON_API_KEY, NEON_PROJECT_ID  Neon
#   SENTRY_AUTH_TOKEN, SENTRY_ORG  Sentry (EU region)
#   TF_STATE_R2_ACCESS_KEY_ID, TF_STATE_R2_SECRET_ACCESS_KEY   R2 key with object read/write on the state bucket
# Optional:
#   NEON_DEV_BRANCH_ID             adopt the existing `dev` branch (see neon.tf)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 2 ]]; then
  echo "usage: infra/tofu.sh <environment> <tofu command and arguments...>" >&2
  exit 2
fi
environment="$1"
shift
dir="$root/infra/envs/$environment"
if [[ ! -d "$dir" ]]; then
  echo "no such environment: infra/envs/$environment" >&2
  exit 2
fi

env_file="${ENV_FILE:-$root/.env}"
if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a
fi

missing=()
for name in TOFU_CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID NEON_API_KEY NEON_PROJECT_ID \
  SENTRY_AUTH_TOKEN SENTRY_ORG TF_STATE_R2_ACCESS_KEY_ID TF_STATE_R2_SECRET_ACCESS_KEY; do
  [[ -n "${!name:-}" ]] || missing+=("$name")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "missing environment variables: ${missing[*]}" >&2
  exit 1
fi

# The deploy token in .env (Pages edit only) must not be picked up by the provider.
export CLOUDFLARE_API_TOKEN="$TOFU_CLOUDFLARE_API_TOKEN"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"
export TF_VAR_neon_project_id="$NEON_PROJECT_ID"
export TF_VAR_sentry_organization="$SENTRY_ORG"
if [[ -n "${NEON_DEV_BRANCH_ID:-}" ]]; then
  export TF_VAR_neon_dev_branch_id="$NEON_DEV_BRANCH_ID"
fi

# R2 as the S3 backend (EU jurisdiction endpoint); see versions.tf.
export AWS_ACCESS_KEY_ID="$TF_STATE_R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$TF_STATE_R2_SECRET_ACCESS_KEY"
export AWS_ENDPOINT_URL_S3="https://${CLOUDFLARE_ACCOUNT_ID}.eu.r2.cloudflarestorage.com"
unset AWS_PROFILE AWS_SESSION_TOKEN

exec tofu -chdir="$dir" "$@"
