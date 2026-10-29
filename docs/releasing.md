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
   | 2   | **API**             | `scripts/deno-deploy.mjs production`: a Deno Deploy production revision with the pooled `DATABASE_URL`, `CORS_ORIGINS`, optional Sentry settings. It waits for the build, promotes it and checks `/health`. |
   | 3   | **web**             | `wrangler pages deploy apps/web/dist --branch=main` (Cloudflare Pages production). Runs only after `GET $PROD_API_URL/health` returns 200.                                                          |
   | 4   | **smoke**           | `GET $PROD_API_URL/health` and `GET $PROD_WEB_URL/` return 200, and the live web bundle contains `PROD_API_URL`.                                                                                  |

   The run's **job summary** says whether it succeeded, or which step failed and what to do about it.

Why the deploy is in the release workflow and not in a separate `on: release` workflow: a tag or release created with the default `GITHUB_TOKEN` does not trigger other workflows. The deploy job is gated on release-please's `release_created` output instead.

Two releases never deploy at the same time (`concurrency: production-deploy`, queued, never cancelled).

## Configuration

Everything is a repository secret or variable (GitHub Free private repositories have no environment secrets). A missing required value fails the run in its first step ("Check production configuration"), before anything is deployed.

| Kind     | Name                       | Required | Where it comes from                                                                                                                                  |
| -------- | -------------------------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| secret   | `DENO_DEPLOY_TOKEN`        |   yes    | Already set for previews (Deno Deploy organisation token).                                                                                           |
| secret   | `CLOUDFLARE_API_TOKEN`     |   yes    | Already set for previews (Pages edit).                                                                                                               |
| secret   | `PROD_DATABASE_URL`        |   yes    | Direct connection string of the production Neon branch `main`, used for migrations. See below.                                                       |
| secret   | `PROD_DATABASE_URL_POOLED` |   yes    | Pooled connection string of the same branch, used by the running API (Neon WebSocket driver). See below.                                             |
| variable | `DENO_APP`                 |   yes    | Already set for previews (`stamina-api`).                                                                                                            |
| variable | `CLOUDFLARE_ACCOUNT_ID`    |   yes    | Already set for previews.                                                                                                                            |
| variable | `CLOUDFLARE_PAGES_PROJECT` |   yes    | Already set for previews (`stamina-web`). The Pages project's production branch must be `main`.                                                      |
| variable | `PROD_API_URL`             |   yes    | `https://` plus the production hostname of the Deno Deploy app, shown in the app's Production timeline (expected: `https://stamina-api.vangaris.deno.net`). No trailing slash. |
| variable | `PROD_WEB_URL`             |   yes    | `https://stamina-web.pages.dev` until a custom domain exists. No trailing slash. It becomes the API's `CORS_ORIGINS`.                                |
| variable | `DENO_ORG`                 |    no    | Deno Deploy organisation (`vangaris`); only used for the console link in the job summary.                                                            |
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
- **API only, fast.** Deno Deploy keeps old revisions. List the production ones and re-promote the previous one:

  ```bash
  export DENO_DEPLOY_TOKEN=... DENO_APP=stamina-api
  node scripts/deno-deploy.mjs revisions            # id, created, release tag, commit; newest first
  node scripts/deno-deploy.mjs promote <revision-id>
  ```

  `promote` pins production to that revision (Deno Deploy `POST /revisions/{id}/promote`), so it keeps serving even though a newer revision exists. The next release promotes its own new revision as part of the deploy, which moves the pin forward again. You can also promote in the Deno Deploy console.

- **Web only.** Cloudflare dashboard > Workers & Pages > `stamina-web` > Deployments > the previous production deployment > **Rollback**.
- **Database: no rollback.** Migrations are forward-only and are never reverted. See the next section.

## Migrations: expand and contract

A release applies its migrations first, and the previous API revision keeps serving traffic until the new one is promoted (and again after a rollback). So every migration **must work with the code of the previous release**, and the previous release's code must work with the schema after the migration.

Split destructive changes over two releases:

1. **Expand** (release N): add the new column, table or index as nullable or with a default; keep the old ones. Deploy code that writes both and reads the new one.
2. **Contract** (release N+1 or later, after N is stable): drop or rename away what nothing uses any more.

Never in a single release: drop or rename a column or table the running code uses, add a `NOT NULL` column without a default, or tighten a type or constraint that the previous code can violate. Never edit an applied migration file; add a new one. Migrations are safety-critical paths (CODEOWNERS), so they need Vang's sign-off note on the PR.

If a migration fails in production, the API and the web stay on the previous release. Check which migrations were recorded in the production database, fix forward with a new migration, and run the workflow again with the same tag.

## Health data and logs

The workflow, the deploy script and the job summary only handle connection strings (as masked secrets), tags, URLs and revision ids. The deploy script's `--dry-run` prints the request shape with every environment variable value redacted:

```bash
DENO_DEPLOY_TOKEN=x DENO_APP=stamina-api DATABASE_URL=x CORS_ORIGINS=https://stamina-web.pages.dev \
  node scripts/deno-deploy.mjs production --dry-run
```

## What is not verified by the repository's own checks

The release chain cannot run end to end until the production secrets and variables above exist and a release PR has been merged. The first real release is the first full test; do it while nothing depends on production, and expect to fix configuration (for example the exact production hostname) on the first run. Re-running via **Run workflow** with the same tag is safe.
