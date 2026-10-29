#!/usr/bin/env bash
# Prepares Brevo (EU email provider) for Neon Auth's sign-in codes: verifies the API key, makes sure
# the sender address exists, and prints the SMTP host, port and login Neon Auth needs (ticket 04).
# Idempotent: an existing sender is left alone.
#
#   scripts/ops/brevo-setup.sh [--dry-run] [--ask-key]
#
# Env (also read from ./.env, or the file named by ENV_FILE):
#   BREVO_API_KEY   API key from Brevo > SMTP & API > API keys (never printed)
#   SENDER_EMAIL    the From address, e.g. Vang's own address until a domain is owned
# Optional:
#   SENDER_NAME     display name (default "Stamina")
#   BREVO_API_BASE  API root (default https://api.brevo.com/v3; tests point it at a mock)
#
# --dry-run prints every request the real run would send and sends nothing, so it needs no API key.
# --ask-key prompts (hidden) for the API key and saves it to .env, replacing any saved key.
#
# API reference: https://developers.brevo.com/reference/get-account, .../get-senders, .../create-sender
#
# Not possible over the API:
#   * The SMTP password. Brevo > SMTP & API > SMTP > "Generate a new SMTP key". It is not the API key.
#   * Domain authentication (SPF, DKIM, DMARC) needs a domain Stamina owns, and none exists yet. Until
#     then a new sender must be verified from the email Brevo sends to it, and mail is sent from that
#     address unauthenticated (docs/infra.md, "Gaps until a domain exists").
set -euo pipefail

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
}

dry_run=false
ask_key=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    --ask-key) ask_key=true ;;
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

if [[ "$ask_key" == true ]]; then
  [[ -t 0 ]] || { echo "--ask-key needs a terminal" >&2; exit 2; }
  read -rs -p "Paste the Brevo API key, then press Enter (nothing is shown): " BREVO_API_KEY
  echo
  BREVO_API_KEY="${BREVO_API_KEY//[[:space:]]/}"
  [[ -n "$BREVO_API_KEY" ]] || { echo "empty key" >&2; exit 2; }
  tmp="$(mktemp)"
  [[ -f "$env_file" ]] && { grep -v '^BREVO_API_KEY=' "$env_file" > "$tmp" || true; }
  printf "BREVO_API_KEY='%s'\n" "$BREVO_API_KEY" >> "$tmp"
  cat "$tmp" > "$env_file"
  rm -f "$tmp"
  chmod 600 "$env_file"
  export BREVO_API_KEY
fi

: "${SENDER_EMAIL:?SENDER_EMAIL is required (the From address for sign-in emails)}"
if [[ "$dry_run" == false ]]; then
  : "${BREVO_API_KEY:?BREVO_API_KEY is required (Brevo > SMTP & API > API keys)}"
fi
if [[ ! "$SENDER_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
  echo "SENDER_EMAIL is not an email address" >&2
  exit 2
fi

base="${BREVO_API_BASE:-https://api.brevo.com/v3}"
sender_name="${SENDER_NAME:-Stamina}"

# js 'EXPR' evaluates EXPR with the JSON on stdin bound to `v`; inputs travel through the environment.
js() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v;try{v=JSON.parse(s)}catch{process.exit(3)}const r=eval(process.argv[1]);if(r!==undefined&&r!==null)console.log(typeof r==="object"?JSON.stringify(r):r)})' "$1"
}

sender_body="$(NAME="$sender_name" EMAIL="$SENDER_EMAIL" node -e 'console.log(JSON.stringify({name:process.env.NAME,email:process.env.EMAIL}))')"

if [[ "$dry_run" == true ]]; then
  cat <<PLAN
dry run: nothing is sent. A real run sends, in order (header api-key: <BREVO_API_KEY>):
  1. GET  $base/account   verify the key; read the SMTP relay host, port and login
  2. GET  $base/senders   look for $SENDER_EMAIL
     POST $base/senders   only when it is missing:
       $sender_body
PLAN
  exit 0
fi

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

# call METHOD URL [JSON_BODY] prints the HTTP status and leaves the body in $out. The key reaches curl on
# stdin, so it is never in the process list.
call() {
  local method="$1" target="$2" data="${3:-}" args=()
  args=(-sS -o "$out" -w '%{http_code}' -X "$method" -K - -H 'accept: application/json')
  if [[ -n "$data" ]]; then
    args+=(-H 'content-type: application/json' --data "$data")
  fi
  printf 'header = "api-key: %s"\n' "$BREVO_API_KEY" | curl "${args[@]}" "$target"
}

fail() { # fail "what" STATUS
  echo "$1 failed: HTTP $2" >&2
  head -c 600 "$out" >&2
  echo >&2
  exit 1
}

status="$(call GET "$base/account")"
[[ "$status" == 200 ]] || fail "authenticating with Brevo" "$status"
account="$(cat "$out")"
echo "Brevo key accepted for $(printf '%s' "$account" | js 'v.email')"

relay_enabled="$(printf '%s' "$account" | js 'v.relay && v.relay.enabled')"
relay_host="$(printf '%s' "$account" | js 'v.relay && v.relay.data && v.relay.data.relay')"
relay_port="$(printf '%s' "$account" | js 'v.relay && v.relay.data && v.relay.data.port')"
relay_login="$(printf '%s' "$account" | js 'v.relay && v.relay.data && v.relay.data.userName')"
if [[ "$relay_enabled" != true || -z "$relay_host" || -z "$relay_port" || -z "$relay_login" ]]; then
  echo "the SMTP relay is not enabled on this Brevo account: activate transactional email in the Brevo console first" >&2
  exit 1
fi

status="$(call GET "$base/senders")"
[[ "$status" == 200 ]] || fail "listing senders" "$status"
sender="$(EMAIL="$SENDER_EMAIL" node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const f = (JSON.parse(s).senders ?? []).find((x) => String(x.email).toLowerCase() === process.env.EMAIL.toLowerCase());
    if (f) console.log(JSON.stringify(f));
  });' <"$out")"

if [[ -n "$sender" ]]; then
  active="$(printf '%s' "$sender" | js 'v.active')"
  echo "sender $SENDER_EMAIL exists (id $(printf '%s' "$sender" | js 'v.id'), active: $active)"
  if [[ "$active" != true ]]; then
    echo "it is not active yet: open the verification email Brevo sent to $SENDER_EMAIL"
  fi
else
  status="$(call POST "$base/senders" "$sender_body")"
  [[ "$status" == 200 || "$status" == 201 ]] || fail "creating the sender" "$status"
  echo "created sender $SENDER_EMAIL (id $(js 'v.id' <"$out")); open the verification email Brevo sent to it"
fi

cat <<END_SMTP

SMTP settings for Neon Auth (ticket 04):
  host      $relay_host
  port      $relay_port
  login     $relay_login
  password  an SMTP key: Brevo > SMTP & API > SMTP > "Generate a new SMTP key" (not the API key)
  from      $sender_name <$SENDER_EMAIL>

Domain authentication (SPF/DKIM/DMARC) needs a domain Stamina owns; none exists yet, so it is not set up.
END_SMTP
