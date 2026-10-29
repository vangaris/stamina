#!/usr/bin/env bash
# Checks (and with --create, creates) the Deno Deploy app that serves the API. Deno Deploy has no
# OpenTofu provider this repo trusts (the official one is still v0.1.0), hence a script.
# Idempotent: nothing is changed when the app exists.
#
#   scripts/ops/deno-setup.sh [--create] [--dry-run]
#
# Env (also read from ./.env, or the file named by ENV_FILE):
#   DENO_DEPLOY_TOKEN  organisation token (never printed)
# Optional:
#   DENO_APP           app slug (default stamina-api)
#   DENO_ORG           organisation slug (default vangaris); used for the console link and --create
#   PROD_API_URL       when set, must match the app's production hostname
#   DENO_API_BASE      API root (default https://api.deno.com/v2; tests point it at a mock)
#
# Verifies: the token works, the app exists, the app-level environment variables (key names only,
# never values), and the production hostname once a production revision exists.
#
# --create     create the app in region eu when it is missing (needs the `deno` CLI; deploys a 1-line
#              placeholder, real revisions come from the release workflow)
# --dry-run    print the requests (and the create command) and send nothing
#
# What is NOT set here, on purpose:
#   * Runtime environment variables. DATABASE_URL, CORS_ORIGINS and SENTRY_DSN are set per revision by
#     the release workflow (scripts/deno-deploy.mjs), so a revision is immutable and reproducible.
#     Preview revisions set their own, so app-level variables must not hold production values.
#   * Anything secret at app level. The field-encryption key is the one runtime secret that lives in
#     Deno's production settings (docs/infra.md); it is entered in the console, never by script.
#   * The region. It is chosen at creation (--region eu) and the REST API does not report it: confirm
#     it in the console (app > Settings). A wrong region needs a new app.
#
# API reference: https://api.deno.com/v2/openapi.json
set -euo pipefail

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
}

create=false
dry_run=false
for arg in "$@"; do
  case "$arg" in
    --create) create=true ;;
    --dry-run) dry_run=true ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file="${ENV_FILE:-$root/.env}"
if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a
fi

app="${DENO_APP:-stamina-api}"
org="${DENO_ORG:-vangaris}"
base="${DENO_API_BASE:-https://api.deno.com/v2}"
if [[ ! "$app" =~ ^[a-z0-9]([a-z0-9-]{1,30})[a-z0-9]$ ]]; then
  echo "DENO_APP is not a valid app slug: $app" >&2
  exit 2
fi
if [[ ! "$org" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]]; then
  echo "DENO_ORG is not a valid organisation slug: $org" >&2
  exit 2
fi

create_cmd=(deno deploy create --org "$org" --app "$app" --source local --runtime-mode dynamic
  --entrypoint server.js --build-timeout 5 --build-memory-limit 1024 --region eu -y)

if [[ "$dry_run" == true ]]; then
  cat <<PLAN
dry run: nothing is sent. A real run sends (Authorization: Bearer <DENO_DEPLOY_TOKEN>):
  1. GET $base/apps/$app                          the app exists; app-level variable names
  2. GET $base/apps/$app/revisions?limit=10       newest revisions
     GET $base/revisions/<id>                     until one has a production timeline: its hostnames
PLAN
  if [[ "$create" == true ]]; then
    echo "  --create, only when step 1 returns 404, runs in a temp dir holding a placeholder server.js:"
    echo "     DENO_DEPLOY_TOKEN=<token> ${create_cmd[*]}"
  fi
  exit 0
fi

: "${DENO_DEPLOY_TOKEN:?DENO_DEPLOY_TOKEN is required}"

out="$(mktemp)"
tmp=""
trap 'rm -f "$out"; [[ -z "$tmp" ]] || rm -rf "$tmp"' EXIT

# call METHOD URL prints the HTTP status and leaves the body in $out. The token reaches curl on stdin.
call() {
  printf 'header = "Authorization: Bearer %s"\n' "$DENO_DEPLOY_TOKEN" |
    curl -sS -o "$out" -w '%{http_code}' -X "$1" -K - -H 'accept: application/json' "$2"
}

# js 'EXPR' evaluates EXPR with the JSON on stdin bound to `v`.
js() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v;try{v=JSON.parse(s)}catch{process.exit(3)}const r=eval(process.argv[1]);if(r!==undefined&&r!==null)console.log(typeof r==="object"?JSON.stringify(r):r)})' "$1"
}

fail() { # fail "what" STATUS
  echo "$1 failed: HTTP $2" >&2
  head -c 600 "$out" >&2
  echo >&2
  exit 1
}

status="$(call GET "$base/apps/$app")"
if [[ "$status" == 401 || "$status" == 403 ]]; then
  fail "authenticating with Deno Deploy (is DENO_DEPLOY_TOKEN an organisation token for $org?)" "$status"
fi

if [[ "$status" == 404 ]]; then
  if [[ "$create" == false ]]; then
    echo "app $app does not exist in organisation $org. Create it with:" >&2
    echo "  scripts/ops/deno-setup.sh --create" >&2
    exit 1
  fi
  command -v deno >/dev/null 2>&1 || {
    echo "--create needs the deno CLI (brew install deno)" >&2
    exit 1
  }
  tmp="$(mktemp -d)"
  printf 'export default { fetch: () => new Response("stamina-api placeholder") };\n' >"$tmp/server.js"
  # The placeholder's first build may fail (no default entrypoint yet); what matters is that the app
  # now exists. Real revisions come from the release workflow with their own config.
  (cd "$tmp" && DENO_DEPLOY_TOKEN="$DENO_DEPLOY_TOKEN" "${create_cmd[@]}") || true
  status="$(call GET "$base/apps/$app")"
fi
[[ "$status" == 200 ]] || fail "reading app $app" "$status"

echo "app $app exists in organisation $org (id $(js 'v.id' <"$out"))"
echo "  console: https://console.deno.com/$org/$app"
echo "  region:  chosen at creation (eu); not reported by the API: confirm under app > Settings"

keys="$(js '(v.env_vars ?? []).map((e) => e.key + (e.secret ? " (secret)" : "")).join(", ")' <"$out")"
echo "  app-level environment variables: ${keys:-none}"
if [[ ", $keys," == *", DATABASE_URL"* ]]; then
  echo "  warning: DATABASE_URL is set at app level; the release workflow sets it per revision, so remove the app-level one" >&2
fi

# --- production hostname -----------------------------------------------------------------------------
status="$(call GET "$base/apps/$app/revisions?limit=10")"
[[ "$status" == 200 ]] || fail "listing revisions" "$status"
revisions="$(js 'v.filter((r) => r.status === "succeeded").map((r) => r.id).join(" ")' <"$out")"
hostnames=""
for revision in $revisions; do
  status="$(call GET "$base/revisions/$revision")"
  [[ "$status" == 200 ]] || fail "reading revision $revision" "$status"
  hostnames="$(js '(v.timelines ?? []).filter((t) => t.context === "production").flatMap((t) => t.hostnames).join(" ")' <"$out")"
  [[ -z "$hostnames" ]] || break
done

if [[ -z "$hostnames" ]]; then
  echo "  production hostname: none yet (the release workflow creates the first production revision)"
  exit 0
fi
echo "  production hostname(s): $hostnames"
if [[ -n "${PROD_API_URL:-}" ]]; then
  expected="${PROD_API_URL#https://}"
  expected="${expected%%/*}"
  if [[ " $hostnames " != *" $expected "* ]]; then
    echo "  warning: PROD_API_URL ($PROD_API_URL) is not one of the production hostnames" >&2
    exit 1
  fi
  echo "  PROD_API_URL matches"
fi
