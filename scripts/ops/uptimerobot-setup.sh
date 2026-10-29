#!/usr/bin/env bash
# Creates (or updates) the UptimeRobot monitor that checks the production API's /health every
# 5 minutes and emails Vang. UptimeRobot has no OpenTofu provider this repo trusts, hence a script.
# Idempotent: the monitor and the alert contact are found by name / address and only created or
# patched when missing or different. Run it again after any change.
#
#   scripts/ops/uptimerobot-setup.sh [--dry-run]
#
# Env (also read from ./.env, or the file named by ENV_FILE):
#   UPTIMEROBOT_API_KEY  API key from https://dashboard.uptimerobot.com/integrations (never printed)
#   PROD_API_URL         production API origin, e.g. https://stamina-api.vangaris.deno.net
#   ALERT_EMAIL          where alerts go (Vang's email)
# Optional:
#   MONITOR_NAME         friendly name, also the identity of the monitor (default "stamina-api /health")
#   UPTIMEROBOT_API_BASE API root (default https://api.uptimerobot.com/v3; tests point it at a mock)
#
# --dry-run prints every request the real run would send (find-or-create steps listed in order) and
# sends nothing, so it needs no API key.
#
# API reference: https://uptimerobot.com/api/v3/ (OpenAPI: https://cdn.uptimerobot.com/api/openapi.yaml)
# Push alerts cannot be created over the API: install the UptimeRobot mobile app and sign in, see docs/infra.md.
set -euo pipefail

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
}

dry_run=false
for arg in "$@"; do
  case "$arg" in
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

: "${PROD_API_URL:?PROD_API_URL is required, e.g. https://stamina-api.vangaris.deno.net}"
: "${ALERT_EMAIL:?ALERT_EMAIL is required}"
if [[ "$dry_run" == false ]]; then
  : "${UPTIMEROBOT_API_KEY:?UPTIMEROBOT_API_KEY is required (https://dashboard.uptimerobot.com/integrations)}"
fi

if [[ ! "$PROD_API_URL" =~ ^https://[^/[:space:]]+(/[^[:space:]]*)?$ ]]; then
  echo "PROD_API_URL must be an https URL, got: $PROD_API_URL" >&2
  exit 2
fi
if [[ ! "$ALERT_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "ALERT_EMAIL is not an email address" >&2
  exit 2
fi

base="${UPTIMEROBOT_API_BASE:-https://api.uptimerobot.com/v3}"
monitor_name="${MONITOR_NAME:-stamina-api /health}"
health_url="${PROD_API_URL%/}/health"
interval=300 # seconds; the free plan's minimum is 5 minutes
timeout_s=30

# js 'EXPR' evaluates EXPR with the JSON on stdin bound to `v`, using the environment for inputs.
# Only fixed expressions are passed in; values travel through the environment, never the code.
js() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v;try{v=JSON.parse(s)}catch{process.exit(3)}const r=eval(process.argv[1]);if(r!==undefined&&r!==null)console.log(typeof r==="object"?JSON.stringify(r):r)})' "$1"
}

contact_body="$(EMAIL="$ALERT_EMAIL" node -e 'console.log(JSON.stringify({type:"Email",friendlyName:"Vang (stamina alerts)",value:process.env.EMAIL}))')"
monitor_body() {
  # $1 = alert contact id, or the literal placeholder when only printing
  CONTACT_ID="$1" NAME="$monitor_name" URL="$health_url" INTERVAL="$interval" TIMEOUT="$timeout_s" node -e '
    const e = process.env;
    const id = /^\d+$/.test(e.CONTACT_ID) ? Number(e.CONTACT_ID) : e.CONTACT_ID;
    console.log(JSON.stringify({
      friendlyName: e.NAME, type: "HTTP", url: e.URL, interval: Number(e.INTERVAL), timeout: Number(e.TIMEOUT),
      httpMethodType: "GET",
      assignedAlertContacts: [{ alertContactId: id, threshold: 0, recurrence: 0 }],
    }));'
}

if [[ "$dry_run" == true ]]; then
  cat <<PLAN
dry run: nothing is sent. A real run sends, in order (Authorization: Bearer <UPTIMEROBOT_API_KEY>):
  1. GET   $base/user/me                     verify the key
  2. GET   $base/alert-contacts?limit=200    find the Email contact for $ALERT_EMAIL (follows pagination)
     POST  $base/alert-contacts              only when none exists:
       $contact_body
  3. GET   $base/monitors?limit=200&name=...  find the monitor named "$monitor_name" (exact match)
     POST  $base/monitors                    only when none exists:
       $(monitor_body '<alert contact id from step 2>')
     PATCH $base/monitors/<id>               only when url, interval or the alert contact differ
PLAN
  exit 0
fi

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

# call METHOD URL [JSON_BODY] prints the HTTP status and leaves the body in $out. The key reaches curl
# on stdin, so it is never in the process list.
call() {
  local method="$1" target="$2" data="${3:-}" args=()
  args=(-sS -o "$out" -w '%{http_code}' -X "$method" -K - -H 'accept: application/json')
  if [[ -n "$data" ]]; then
    args+=(-H 'content-type: application/json' --data "$data")
  fi
  printf 'header = "Authorization: Bearer %s"\n' "$UPTIMEROBOT_API_KEY" | curl "${args[@]}" "$target"
}

fail() { # fail "what" STATUS
  echo "$1 failed: HTTP $2" >&2
  head -c 600 "$out" >&2
  echo >&2
  exit 1
}

# list_all PATH_WITH_QUERY prints every item of a paginated {data, nextLink} list as one JSON array.
list_all() {
  local target="$base$1" status page items='[]' next pages=0
  while :; do
    status="$(call GET "$target")"
    [[ "$status" == 200 ]] || fail "GET $target" "$status"
    page="$(cat "$out")"
    items="$(ITEMS="$items" PAGE="$page" node -e 'console.log(JSON.stringify(JSON.parse(process.env.ITEMS).concat(JSON.parse(process.env.PAGE).data??[])))')"
    next="$(printf '%s' "$page" | js 'v.nextLink')"
    pages=$((pages + 1))
    [[ -n "$next" && "$pages" -lt 50 ]] || break
    case "$next" in
      http*) target="$next" ;;
      /*) target="${base%/v3*}$next" ;;
      *) target="$base$1&cursor=$next" ;;
    esac
  done
  printf '%s' "$items"
}

status="$(call GET "$base/user/me")"
[[ "$status" == 200 ]] || fail "authenticating with UptimeRobot" "$status"
echo "UptimeRobot key accepted for $(js 'v.email' <"$out")"

# --- alert contact ----------------------------------------------------------------------------------
contacts="$(list_all '/alert-contacts?limit=200')"
contact_id="$(CONTACTS="$contacts" EMAIL="$ALERT_EMAIL" node -e '
  const c = JSON.parse(process.env.CONTACTS).find(
    (x) => String(x.type).toLowerCase() === "email" && String(x.value ?? "").toLowerCase() === process.env.EMAIL.toLowerCase());
  if (c) console.log(c.id);')"
if [[ -n "$contact_id" ]]; then
  echo "alert contact for $ALERT_EMAIL exists (id $contact_id)"
else
  status="$(call POST "$base/alert-contacts" "$contact_body")"
  [[ "$status" == 200 || "$status" == 201 ]] || fail "creating the alert contact" "$status"
  contact_id="$(js 'v.id' <"$out")"
  [[ -n "$contact_id" ]] || fail "reading the new alert contact id" "$status"
  echo "created alert contact for $ALERT_EMAIL (id $contact_id); confirm it from the email UptimeRobot sends"
fi

# --- monitor ----------------------------------------------------------------------------------------
query="$(NAME="$monitor_name" node -e 'console.log(encodeURIComponent(process.env.NAME))')"
monitors="$(list_all "/monitors?limit=200&name=$query")"
existing="$(MONITORS="$monitors" NAME="$monitor_name" node -e '
  const m = JSON.parse(process.env.MONITORS).find((x) => x.friendlyName === process.env.NAME);
  if (m) console.log(JSON.stringify(m));')"

if [[ -z "$existing" ]]; then
  status="$(call POST "$base/monitors" "$(monitor_body "$contact_id")")"
  [[ "$status" == 200 || "$status" == 201 ]] || fail "creating the monitor" "$status"
  echo "created monitor \"$monitor_name\" (id $(js 'v.id' <"$out")): $health_url every ${interval}s"
  exit 0
fi

monitor_id="$(printf '%s' "$existing" | js 'v.id')"
needs_patch="$(EXISTING="$existing" URL="$health_url" INTERVAL="$interval" CONTACT_ID="$contact_id" node -e '
  const m = JSON.parse(process.env.EXISTING);
  const has = (m.assignedAlertContacts ?? []).some((c) => String(c.alertContactId) === process.env.CONTACT_ID);
  if (m.url !== process.env.URL || Number(m.interval) !== Number(process.env.INTERVAL) || !has) console.log("yes");')"
if [[ -z "$needs_patch" ]]; then
  echo "monitor \"$monitor_name\" (id $monitor_id) is up to date"
  exit 0
fi

# Keep the contacts already assigned and add ours.
patch_body="$(EXISTING="$existing" URL="$health_url" INTERVAL="$interval" CONTACT_ID="$contact_id" node -e '
  const e = process.env, m = JSON.parse(e.EXISTING);
  const assigned = (m.assignedAlertContacts ?? []).filter((c) => String(c.alertContactId) !== e.CONTACT_ID);
  assigned.push({ alertContactId: Number(e.CONTACT_ID), threshold: 0, recurrence: 0 });
  console.log(JSON.stringify({ url: e.URL, interval: Number(e.INTERVAL), assignedAlertContacts: assigned }));')"
status="$(call PATCH "$base/monitors/$monitor_id" "$patch_body")"
[[ "$status" == 200 ]] || fail "updating monitor $monitor_id" "$status"
echo "updated monitor \"$monitor_name\" (id $monitor_id): $health_url every ${interval}s"
