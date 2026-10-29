#!/usr/bin/env bash
# Installs the tools the backup and restore-test workflows need on an ubuntu GitHub runner:
#   - age (pinned release, checksum verified), into /usr/local/bin
#   - PostgreSQL 17 client tools from PGDG (pg_dump/pg_restore/psql must be >= the Neon server, 17)
# The aws CLI v2 is preinstalled on ubuntu-latest runners.
# Runner-only: uses sudo and apt. Locally, `brew install age libpq` instead.
set -euo pipefail

age_version=1.3.2
age_sha256=cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -sSfL -o "$tmp/age.tgz" \
  "https://github.com/FiloSottile/age/releases/download/v${age_version}/age-v${age_version}-linux-amd64.tar.gz"
echo "${age_sha256}  $tmp/age.tgz" | sha256sum -c -
tar -xzf "$tmp/age.tgz" -C "$tmp"
sudo install -m 0755 "$tmp/age/age" "$tmp/age/age-keygen" /usr/local/bin/

sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt-get install -y -qq postgresql-client-17

# Put the 17 binaries first so the pg_wrapper in /usr/bin cannot pick the preinstalled 16.
if [ -n "${GITHUB_PATH:-}" ]; then
  echo /usr/lib/postgresql/17/bin >> "$GITHUB_PATH"
fi
age --version
/usr/lib/postgresql/17/bin/pg_dump --version
