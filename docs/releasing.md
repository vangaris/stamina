# Releasing

Production is deployed by merging a release PR. Nothing else deploys to production.

## How a release happens

1. Pull requests are squash-merged to `main` with a Conventional Commit title (`pr-title.yml` enforces it).
2. On every push to `main`, [release-please](https://github.com/googleapis/release-please-action) (`.github/workflows/release.yml`) opens or updates **one release PR** titled `chore: release X.Y.Z`. It bumps `package.json` and `.release-please-manifest.json` and writes `CHANGELOG.md` from the commit titles.
   - `feat:` is a minor bump, `fix:` a patch. While the version is `0.x`, a breaking change (`feat!:`, or a `BREAKING CHANGE:` footer) bumps the minor version, not the major.
   - `docs:`, `chore:`, `ci:`, `test:` and similar do not appear in the changelog and do not start a release on their own.
   - To force a version, put `Release-As: 1.0.0` in a commit body on `main`.
3. **You merge the release PR.** The same workflow run then, in this order, and stops at the first failure:

   | #   | Step                | What it does                                                                                                                                                                                       |
   | --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 0   | tag and build       | release-please tags `vX.Y.Z` and creates the GitHub release. The API and the web are built (web with the production API URL), so a build failure changes nothing in production.                   |
   | 1   | **migrate**         | `pnpm --filter @stamina/api db:migrate` against the production Neon branch (`PROD_DATABASE_URL`, direct connection).                                                                               |
   | 2   | **API**             | `scripts/workers-deploy.mjs production`: deploys the Worker `stamina-api` with `CORS_ORIGINS`, `NEON_AUTH_BASE_URL` and `SENTRY_ENVIRONMENT` as plain vars and the pooled `DATABASE_URL` (and `SENTRY_DSN` when set) as Worker secrets, then checks `/health`. The step fails if the deployed URL is not `PROD_API_URL`. |
   | 3   | **web**             | `scripts/ops/write-auth-proxy-config.mjs` points the Pages Function that proxies `/auth/*` at `NEON_AUTH_BASE_URL`, then `wrangler pages deploy dist --branch=main` runs from `apps/web` (Cloudflare Pages production). Runs only after `GET $PROD_API_URL/health` returns 200. |
   | 4   | **smoke**           | `GET $PROD_API_URL/health` and `GET $PROD_WEB_URL/` return 200, and the live web bundle contains `PROD_API_URL`.                                                                                  |

   The run's **job summary** says whether it succeeded, or which step failed and what to do about it.

Why the deploy is in the release workflow and not in a separate `on: release` workflow: a tag or release created with the default `GITHUB_TOKEN` does not trigger other workflows. The deploy job is gated on release-please's `release_created` output instead.

Two releases never deploy at the same time (`concurrency: production-deploy`, queued, never cancelled).

## Configuration

Everything is a repository secret or variable (GitHub Free private repositories have no environment secrets). A missing required value fails the run in its first step ("Check production configuration"), before anything is deployed.

| Kind     | Name                       | Required | Where it comes from                                                                                                                                  |
| -------- | -------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| secret   | `CLOUDFLARE_API_TOKEN`     |   yes    | Already set for previews; it needs Pages edit **and** Workers Scripts edit (see [infra.md](infra.md), "Runbook: Cloudflare token and Workers").                                                                                                               |
| secret   | `PROD_DATABASE_URL`        |   yes    | Direct connection string of the production Neon branch `main`, used for migrations. See below.                                                       |
| secret   | `PROD_DATABASE_URL_POOLED` |   yes    | Pooled connection string of the same branch, used by the running API (Neon WebSocket driver). See below.                                             |
| variable | `CLOUDFLARE_ACCOUNT_ID`    |   yes    | Already set for previews.                                                                                                                            |
| variable | `CLOUDFLARE_PAGES_PROJECT` |   yes    | Already set for previews (`stamina-web`). The Pages project's production branch must be `main`.                                                      |
| variable | `PROD_API_URL`             |   yes    | The production Worker's URL, `https://stamina-api.<account workers.dev subdomain>.workers.dev`. No trailing slash. The preflight step checks it against the subdomain Cloudflare reports. |
| variable | `PROD_WEB_URL`             |   yes    | `https://stamina-web.pages.dev` until a custom domain exists. No trailing slash. It becomes the API's `CORS_ORIGINS`.                                |
| variable | `NEON_AUTH_BASE_URL`       |   yes    | The production Neon branch's Neon Auth `base_url` (`https://ep-...neonauth.<region>.aws.neon.tech/<database>/auth`), printed by `node scripts/ops/neon-auth-setup.mjs --branch main`. It becomes the API's `NEON_AUTH_BASE_URL` and the target of the web's `/auth/*` proxy. See [auth.md](auth.md). |
| variable | `SENTRY_DSN_API`           |    no    | Sentry DSN of the API project. When unset, the API starts without Sentry. A DSN is a public identifier, so it is a variable.                         |
| variable | `SENTRY_DSN_WEB`           |    no    | Sentry DSN of the web project, baked into the web build as `VITE_SENTRY_DSN`. When unset, the web has no error reporting.                            |
| secret   | `RELEASE_PLEASE_TOKEN`     |    no    | Fine-grained personal access token, see below.                                                                                                       |

Also required once, in the repository settings: **Settings > Actions > General > Workflow permissions > "Allow GitHub Actions to create and approve pull requests"**. Without it release-please cannot open the release PR with `GITHUB_TOKEN`.

### Production database URLs

The production database is the Neon branch `main` of the Frankfurt project (`NEON_PROJECT_ID`). With [neonctl](https://neon.com/docs/cli/connection-string) and a Neon API key, the strings go straight into the secrets without being printed:

```bash
export NEON_API_KEY=...        # Neon API key; or `neonctl auth`
gh secret set PROD_DATABASE_URL        --body "$(npx neonctl connection-string main --project-id "$NEON_PROJECT_ID")"
gh secret set PROD_DATABASE_URL_POOLED --body "$(npx neonctl connection-string main --project-id "$NEON_PROJECT_ID" --pooled)"
```

In the Neon console the same two strings are under the project's **Connect** dialog: pick branch `main`, the role and database, and toggle "Connection pooling" off (direct) or on (pooled; the host contains `-pooler`). Do not use the preview or `dev` branch's strings.

### `RELEASE_PLEASE_TOKEN` (optional)

Resources created with the default `GITHUB_TOKEN`, here the release PR and its branch, do **not** trigger other workflows. So without a token of your own, CI, the PR title check and the preview do not run on the release PR. With no branch protection on this repository that does not block merging, and a release PR only changes `package.json`, `CHANGELOG.md` and the manifest, so the default token is acceptable.

To get CI on release PRs, create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) for `vangaris/stamina` only, with repository permissions **Contents: read and write**, **Pull requests: read and write**, **Issues: read and write** (release-please labels the PR), and store it as the secret `RELEASE_PLEASE_TOKEN`:

```bash
gh secret set RELEASE_PLEASE_TOKEN
```

The deploy does not depend on it. Fine-grained tokens expire (maximum one year); when it does, the release job fails at the release-please step until the secret is renewed or removed (the workflow falls back to `GITHUB_TOKEN` when the secret is absent).

## Rollback

Decide by where the run stopped (the job summary tells you); the API and the web roll back independently.

- **Redeploy the previous release (default).** Actions > Release > Run workflow, with `tag` set to the previous release tag (for example `v0.1.0`). It runs the same chain from that tag: migrations (already applied, so nothing happens), API, web, smoke.
- **API only, fast.** Cloudflare keeps the previous Worker versions. Roll `stamina-api` back to the previous one (or to a given version id from `wrangler versions list`, run in `apps/api`):

  ```bash
  export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
  node scripts/workers-deploy.mjs rollback                # the version before the latest
  node scripts/workers-deploy.mjs rollback <version-id>
  ```

  It runs `wrangler rollback`, which makes that version the active deployment at once, then checks `/health`. Worker secrets and vars are part of a version, so the rollback restores the earlier configuration too. The next release deploys a new version and moves forward again. You can also roll back in the Cloudflare dashboard > Workers & Pages > `stamina-api` > Deployments.

- **Web only.** Cloudflare dashboard > Workers & Pages > `stamina-web` > Deployments > the previous production deployment > **Rollback**.
- **Database: no rollback.** Migrations are forward-only and are never reverted. See the next section.

## Migrations: expand and contract

A release applies its migrations first, and the previous API version keeps serving traffic until the new one is deployed (and again after a rollback). So every migration **must work with the code of the previous release**, and the previous release's code must work with the schema after the migration.

Split destructive changes over two releases:

1. **Expand** (release N): add the new column, table or index as nullable or with a default; keep the old ones. Deploy code that writes both and reads the new one.
2. **Contract** (release N+1 or later, after N is stable): drop or rename away what nothing uses any more.

Never in a single release: drop or rename a column or table the running code uses, add a `NOT NULL` column without a default, or tighten a type or constraint that the previous code can violate. Never edit an applied migration file; add a new one. Migrations are safety-critical paths (CODEOWNERS), so they need Vang's sign-off note on the PR.

If a migration fails in production, the API and the web stay on the previous release. Check which migrations were recorded in the production database, fix forward with a new migration, and run the workflow again with the same tag.

## Health data and logs

The workflow, the deploy script and the job summary only handle connection strings (as masked secrets), tags, URLs and version ids. The deploy script never puts a secret on a command line: secrets go to Wrangler through a temporary file that is deleted afterwards. Its `--dry-run` prints the plan with every value redacted and sends nothing:

```bash
CLOUDFLARE_API_TOKEN=x CLOUDFLARE_ACCOUNT_ID=x DATABASE_URL=x CORS_ORIGINS=https://stamina-web.pages.dev \
  NEON_AUTH_BASE_URL=https://ep-x.neonauth.eu-central-1.aws.neon.tech/neondb/auth \
  node scripts/workers-deploy.mjs production --dry-run
```

## What is not verified by the repository's own checks

The release chain cannot run end to end until the production secrets and variables above exist and a release PR has been merged. The first real release is the first full test; do it while nothing depends on production, and expect to fix configuration (for example the Worker URL in `PROD_API_URL`) on the first run. Re-running via **Run workflow** with the same tag is safe.
