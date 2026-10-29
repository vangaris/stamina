# Backups

Production data is copied every night to an EU-jurisdiction Cloudflare R2 bucket, encrypted before it leaves the GitHub runner, and a monthly job proves the latest copy restores. The scripts live in `scripts/ops/`; the workflows are `.github/workflows/backup.yml` and `restore-test.yml`.

## What is backed up

- The whole production Neon database (`main` branch, Frankfurt): every schema, including `drizzle.__drizzle_migrations`, as a `pg_dump` custom-format archive taken with `--no-owner --no-acl`. Roles and grants are not included, so a dump restores into any empty Postgres.
- Not backed up: R2 itself, Cloudflare/Deno/Sentry configuration (declared in OpenTofu and the repo), secrets.
- Neon's own point-in-time history is a separate, short safety net. This backup is the independent copy that survives losing the Neon project.

The dump contains health data. It is encrypted on the runner with [age](https://age-encryption.org) to a public key, streamed straight from `pg_dump` into `age`, so plaintext never touches the runner's disk, R2 or any log. Scripts discard `pg_restore`/`age` output because a failed `COPY` can echo row values; they print counts and exit codes only.

Erasure: a user who deletes their account stays in backups for up to 30 days (the retention window). After any restore, re-apply deletions made since the backup before the app goes live again.

## Nightly backup

`backup.yml` runs at 02:30 UTC (and on demand: Actions -> Backup -> Run workflow).

1. `backup-install-tools.sh`: age v1.3.2 (checksum pinned) and `postgresql-client-17` from PGDG. `pg_dump` must be at least the server version; Neon runs 17.
2. `backup-create.sh`: `pg_dump | age -r $BACKUP_AGE_PUBLIC_KEY` into `stamina-YYYYMMDDTHHMMSSZ.dump.age` (written as `.partial`, renamed only on success).
3. `backup-upload.sh`: `aws s3 cp` to the bucket through `$R2_ENDPOINT`, compares the stored size with the local size, then prunes.

The job summary shows the object key, size and number of pruned objects, nothing else. Any failure fails the run, and GitHub emails the account that owns the workflow. The dump uses the **direct** Neon connection string (`PROD_DATABASE_URL`); `pg_dump` does not work through the pooler.

## Retention

30 days, defined only in `scripts/ops/backup-retention.sh` (`RETENTION_DAYS`). After each upload, `backup-upload.sh` lists the bucket and deletes the keys that script returns:

- strictly older than 30 days by `LastModified` (exactly 30 days old is kept);
- only keys named `stamina-<UTC>.dump.age`; anything else in the bucket is never touched;
- the newest backup is never deleted, so a stalled backup job cannot empty the bucket.

## Monthly restore test

`restore-test.yml` runs on the 5th at 04:00 UTC (and on demand).

1. `restore-fetch.sh` downloads the newest dump, and fails if it is more than 30 hours old (a stopped nightly job must not hide behind an old, restorable dump).
2. A scratch Neon branch `restore-test/YYYYMM` is created with `neondatabase/create-branch-action`. **Parent: `NEON_PARENT_BRANCH` (the data-free `dev` branch), not production**: no real user data is copied to a new place, and the branch auto-expires after one day if the delete step never runs.
3. `restore-prepare.sh` creates an empty database `restore_verify` on that branch, so `pg_restore` cannot collide with objects the parent branch already holds.
4. `restore-verify.sh` decrypts (stream) and runs `pg_restore --no-owner --no-acl --exit-on-error` into it, then checks: restore exits 0, `drizzle.__drizzle_migrations` has rows, `app_user_id()` exists in `public`. It refuses a target that is not empty. It prints one line, for example `RESULT=pass migrations=1 tables=12 app_user_id=1` or `RESULT=fail reason=decrypt_failed ...`, and exits non-zero on failure.
5. The branch is deleted in a final `if: always()` step.
6. The result goes to the job summary. A bad restore fails the run, so GitHub emails Vang.

## Setup (once)

1. Create the bucket in the EU jurisdiction (OpenTofu in `infra/`, or `wrangler r2 bucket create <name> --jurisdiction eu`). Do not enable public access.
2. Create an R2 API token scoped to **Object Read & Write on that one bucket** (not account-wide, not admin). It yields an Access Key ID and Secret Access Key. The S3 endpoint is `https://<cloudflare-account-id>.eu.r2.cloudflarestorage.com`; the `eu` part is required for an EU-jurisdiction bucket.
3. Generate the key pair on your machine: `age-keygen -o stamina-backup.key`. It prints the public key (`age1...`). Store the **whole file** in the password manager now.
4. Set the GitHub repository secrets and variables:

| Kind     | Name                                    | Value                                                          |
| -------- | --------------------------------------- | -------------------------------------------------------------- |
| variable | `BACKUP_AGE_PUBLIC_KEY`                 | the `age1...` public key                                       |
| variable | `R2_BACKUP_BUCKET`                      | bucket name                                                    |
| variable | `R2_ENDPOINT`                           | `https://<account-id>.eu.r2.cloudflarestorage.com`             |
| secret   | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | the scoped R2 token                                          |
| secret   | `PROD_DATABASE_URL`                     | Neon `main` **direct** connection string                       |
| secret   | `BACKUP_AGE_PRIVATE_KEY`                | the `AGE-SECRET-KEY-1...` line (restore test only)             |

Also used from the preview setup: `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_PARENT_BRANCH`.

```bash
gh secret set BACKUP_AGE_PRIVATE_KEY < <(grep '^AGE-SECRET-KEY-' stamina-backup.key)
```

Then run **Backup** and **Restore test** once by hand.

## Key custody

- **The private key lives in Vang's password manager.** It is the only way to read any backup. Lose it and every backup is garbage; keep a second copy somewhere independent of GitHub, Cloudflare and Neon (printed, or a second password-manager vault).
- **It is also a GitHub secret (`BACKUP_AGE_PRIVATE_KEY`), so the monthly test can decrypt without a human.** Tradeoff: anyone who can read Actions secrets could decrypt the backups, but they would also need R2 read access, which is another secret in the same place. The backups are only as private as the GitHub account and repository settings (single owner, 2FA). The public key cannot decrypt anything, so the nightly job holds no decryption power.
- **Alternative if that is not acceptable:** delete the `BACKUP_AGE_PRIVATE_KEY` secret and run the restore test by hand from your laptop (commands below, with the key from the password manager). You lose the automatic monthly proof; the restore test workflow would then only be the fetch step. A second option is a paid GitHub plan with environment-protected secrets that need an approval click per run.
- Rotating: generate a new pair, update `BACKUP_AGE_PUBLIC_KEY` and `BACKUP_AGE_PRIVATE_KEY`. Old backups still need the old private key until they expire (30 days), so keep it that long.

## Restore by hand (emergency)

Needs `age`, `awscli` and PostgreSQL client 17+ (`brew install age awscli libpq`, then put `/opt/homebrew/opt/libpq/bin` on `PATH`).

```bash
export AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...   # the R2 token
export AWS_DEFAULT_REGION=auto
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
R2="https://<account-id>.eu.r2.cloudflarestorage.com"; BUCKET="<bucket>"

# newest backup
KEY="$(aws --endpoint-url "$R2" s3api list-objects-v2 --bucket "$BUCKET" \
  --query 'sort_by(Contents,&LastModified)[-1].Key' --output text)"
aws --endpoint-url "$R2" s3 cp "s3://$BUCKET/$KEY" .

# restore into a NEW, EMPTY database (a new Neon project/branch, or local Postgres).
# TARGET is its direct connection string. Add --clean --if-exists only to overwrite on purpose.
age --decrypt --identity stamina-backup.key "$KEY" \
  | pg_restore --no-owner --no-acl --exit-on-error --dbname "$TARGET"

# sanity check
psql "$TARGET" -c 'select count(*) from drizzle.__drizzle_migrations' -c '\df app_user_id'
```

To go live on the restored database: point `PROD_DATABASE_URL` and `PROD_DATABASE_URL_POOLED` (GitHub secrets) at it, redeploy the API so the Deno revision picks up the pooled URL, and re-apply any account deletions made since the backup.

## Local checks

```bash
scripts/ops/test/smoke.sh          # embedded Postgres, real pg_dump/age/pg_restore, fake aws
scripts/ops/test/retention.test.sh # retention rule against canned bucket listings
shellcheck -x scripts/ops/*.sh scripts/ops/test/*.sh scripts/ops/test/fake-bin/aws
```

`smoke.sh` needs `age`, `jq`, `pg_dump`/`pg_restore`/`psql` 18 or newer (the embedded server is 18) and `pnpm install` done. It starts a throwaway Postgres on port 54391 (`SMOKE_DB_PORT` to change), creates an encrypted backup, proves with `strings` that it shows no SQL or table names, restores it into a scratch database and expects `RESULT=pass`, then proves a wrong key, a truncated file, a non-empty target and a dump without the migrations table all produce `RESULT=fail`. The upload, prune and fetch scripts run against `test/fake-bin/aws`, a local-directory stand-in for the aws CLI.

## Not verified yet

Everything above was exercised locally only. Until real credentials exist, these are untested:

- the R2 S3 calls with the real `aws` CLI (`s3 cp`, `head-object`, `list-objects-v2`, `delete-object`) against an EU-jurisdiction endpoint, including the checksum environment variables in `backup-r2-env.sh`;
- `pg_dump` and `pg_restore` against a real Neon PG 17 database (Neon-specific objects such as extensions in the dump, `CREATE DATABASE` rights of the Neon role in `restore-prepare.sh`);
- the PGDG install in `backup-install-tools.sh` on the current `ubuntu-latest` image;
- the Neon create/delete branch actions with the `restore-test/YYYYMM` name and the first scheduled runs (GitHub may delay cron starts by many minutes).

Cost: the nightly job should take a couple of minutes (about 1 hour of free Actions minutes per month), the monthly test a few more. R2's free tier (10 GB, no egress fees) covers a long time at MVP data volumes `[estimate]`.
