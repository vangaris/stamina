# Development

## Local

Node 22+ and pnpm 10 (`corepack enable`). No Docker or Postgres install is needed: local and test databases are an embedded real Postgres.

```bash
pnpm install
pnpm --filter @stamina/api db:dev          # Postgres on :54329 in apps/api/.pgdata, migrated; Ctrl-C stops it
cp apps/api/.env.example apps/api/.env
pnpm --filter @stamina/api dev             # API on :8787
pnpm --filter @stamina/web dev             # web on :5173 (VITE_API_URL defaults to :8787)
```

| Task                                   | Command                                    |
| -------------------------------------- | ------------------------------------------ |
| lint (incl. module boundaries)         | `pnpm lint`                                |
| typecheck, build                       | `pnpm typecheck`, `pnpm build`             |
| seam 1 (API) and seam 2 (app-core)     | `pnpm test`                                |
| seam 3 (Playwright + axe, phone width) | `pnpm --filter @stamina/web e2e`           |
| only what a branch changed             | `pnpm affected`                            |
| new migration                          | edit `src/db/schema.ts`, `pnpm --filter @stamina/api db:generate` |

- Seam 1 uses `TEST_DATABASE_URL` when set (CI points it at a Postgres service container), otherwise starts an embedded Postgres.
- `pnpm --filter @stamina/web e2e` starts its own Postgres (:54330), API (:8788) and built web (:4173). Set `PLAYWRIGHT_BASE_URL` to run it against a deployed preview instead.
- Migrations are forward-only: never edit an applied file, add a new one.

## Module boundaries

Tags live in each package's `package.json` (`nx.tags`); the rules are in `eslint.config.mjs` and fail `pnpm lint`.

| Tag               | May depend on                                           |
| ----------------- | ------------------------------------------------------- |
| `type:util`       | `type:util`                                             |
| `type:ui`         | `type:ui`, `type:util`                                  |
| `type:domain`     | `type:domain`, `type:util`                              |
| `type:contracts`  | `type:contracts`, `type:util`                           |
| `type:app-core`   | `type:app-core`, `type:domain`, `type:contracts`, `type:util` |
| `type:app`        | anything                                                |
| `scope:shared`    | `scope:shared` (no Vue, no React)                       |
| `scope:vue`       | `scope:vue`, `scope:shared`                             |
| `scope:react`     | `scope:react`, `scope:shared`                           |
| `scope:server`    | `scope:server`, `scope:shared`                          |

A package gets one `type:` and one `scope:` tag. UI components go in `packages/ui/<name>`, shared utilities in `packages/util/<name>`.

## CI and previews

Workflows are in `.github/workflows/`.

- **`ci.yml`**: `nx affected` lint, typecheck, test, build; Gitleaks (pinned binary, full history); OSV-Scanner on `pnpm-lock.yaml`.
- **`pr-title.yml`**: the PR title must be a Conventional Commit (the squash commit message is the title), e.g. `feat: 02 Release, infrastructure and ops pipeline`.
- **`preview.yml`**: per PR, a Neon branch (migrated) + a Deno Deploy preview revision with that branch's `DATABASE_URL` + a Cloudflare Pages alias `pr-<N>`, then `e2e` against it. Closing the PR deletes the Neon branch (it also expires after 14 days). PRs that only touch docs, tickets or templates skip it.

Free-minutes levers: concurrency cancels superseded runs, `nx affected` skips untouched projects, pnpm is cached, doc-only PRs skip the preview.

### One-time setup (needs accounts, not in the repo)

| Where                         | Name                                   | Value                                                                   |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Actions secret                | `NEON_API_KEY`                         | Neon API key                                                            |
| Actions secret                | `DENO_DEPLOY_TOKEN`                    | Deno Deploy organisation token                                          |
| Actions secret                | `CLOUDFLARE_API_TOKEN`                 | token with Pages edit                                                   |
| Actions variable              | `NEON_PROJECT_ID`                      | the Frankfurt project                                                   |
| Actions variable              | `NEON_PARENT_BRANCH`                   | a branch **without real user data** (e.g. `dev`); never production      |
| Actions variable              | `DENO_APP`                             | app slug, created with `deno deploy create --region eu`                 |
| Actions variables             | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT` | Pages project (direct upload)                              |

Each preview API revision gets its own `DATABASE_URL` and `CORS_ORIGINS` as immutable revision env vars (`scripts/deno-deploy-preview.mjs`), so app-level Deno variables are not used for previews.
