# Infrastructure

Infrastructure is declared in code. **OpenTofu** manages Cloudflare, Neon and Sentry; three vendors OpenTofu cannot manage well get idempotent setup scripts; app deploys stay in GitHub Actions (`ci.yml`, `preview.yml`, the release workflow), never in OpenTofu. Why: [Cloud and environments](../.scratch/mvp-plan/issues/21-cloud-and-environments.md).

| What                                           | Managed by                                                  |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Cloudflare Pages project `stamina-web`         | OpenTofu (adopted by import; deploys are wrangler in CI)    |
| Cloudflare R2 backup bucket + 30-day lifecycle | OpenTofu                                                    |
| Cloudflare DNS, Pages custom domain            | OpenTofu, only once `zone_id` is set (no domain yet)        |
| Neon project `stamina`, branches `main`, `dev` | OpenTofu (both adopted by import)                           |
| Neon per-PR `preview/pr-N` branches            | `preview.yml` (created and deleted per PR)                  |
| Sentry (EU): team, projects, client keys       | OpenTofu                                                    |
| OpenTofu state bucket `stamina-tfstate`        | `infra/bootstrap.sh` (it cannot create its own home)        |
| Cloudflare Worker `stamina-api` (+ `stamina-api-pr-N`) | `scripts/workers-deploy.mjs` in `release.yml` / `preview.yml`; config in `apps/api/wrangler.jsonc` |
| UptimeRobot monitor                            | `scripts/ops/uptimerobot-setup.sh`                          |
| Brevo sender + SMTP settings                   | `scripts/ops/brevo-setup.sh`                                |
| Neon Auth (sign-in) per branch                 | `scripts/ops/neon-auth-setup.mjs` (previews: `preview.yml`); runbook in [auth.md](auth.md) |

## API host

Phase A (owner only, no payment method): the Hono API runs on **Cloudflare Workers** (free plan, no card), deployed with Wrangler by `scripts/workers-deploy.mjs`. Production is the Worker `stamina-api`, each pull request gets `stamina-api-pr-<N>` (deleted when the PR closes), at `https://<name>.<account subdomain>.workers.dev`. A Worker runs at the Cloudflare location nearest the caller and the free plan does not promise EU processing, which is fine for the owner alone and not for real users' health data.

Launch options (ticket 23, EU-guaranteed host): **Deno Deploy EU** or **Cloud Run europe-west1**. The app is portable Hono; each host needs only an entry file. The Deno Deploy scripts (`scripts/deno-deploy.mjs`, `scripts/ops/deno-setup.sh`) and the Deno parts of the setup wizards were removed when the API moved to Workers; they are in git history before the commit that added `scripts/workers-deploy.mjs`. Deno Deploy suspended the free organisation (`402 BILLING_SUSPENDED`) and asks for a card.

Free-plan limits (100k requests/day, about 10 ms CPU per request; from the hosting research, **not yet measured on the deployed Worker**) and the CPU time of `GET /me` (JWT verification and the RLS transaction) are recorded here once the first Worker is deployed.

## Layout

```
infra/
  bootstrap.sh              creates the EU R2 state bucket (idempotent)
  tofu.sh                   runs tofu for one environment with credentials from the environment
  envs/production/          one config per environment
    versions.tf             providers (pinned), S3 backend on R2
    variables.tf            identifiers only, no secrets
    cloudflare.tf  neon.tf  sentry.tf  outputs.tf
    tests/plan.tftest.hcl   offline tests, providers mocked
    .terraform.lock.hcl     committed; linux_amd64 + darwin_arm64
  test/ops-scripts.test.mjs offline tests of the scripts, against mock HTTP servers
scripts/ops/{uptimerobot,brevo}-setup.sh   scripts/ops/neon-auth-setup.mjs   scripts/workers-deploy.mjs
```

Providers: `cloudflare/cloudflare` 5.28.1 (official), `kislerdm/neon` 0.18.0 (community, Neon-sponsored), `jianyuan/sentry` 0.15.8 (community, Sentry-sponsored). Bump a version in `versions.tf`, then `tofu -chdir=infra/envs/production init -upgrade -backend=false` and `tofu -chdir=infra/envs/production providers lock -platform=linux_amd64 -platform=darwin_arm64`.

## Tokens and where they live

Secrets never go in files. Locally they are in the gitignored `.env` (`infra/tofu.sh` and the scripts read it, or the file named by `ENV_FILE`); CI uses repository secrets and variables (GitHub Free has no environment secrets). The names are the same everywhere.

| Name                                                          | Kind                       | Where it comes from                                                                                                                                                                            |
| ------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOFU_CLOUDFLARE_API_TOKEN`                                   | secret                     | Cloudflare > My Profile > API Tokens. Account: Cloudflare Pages Edit, Workers R2 Storage Edit; Zone (when a zone exists): DNS Edit. **CI gets a separate read-only token** (the same permissions as Read), because the plan never writes. Kept apart from `CLOUDFLARE_API_TOKEN` (Pages deploys) so a deploy token cannot touch R2 or DNS. |
| `CLOUDFLARE_ACCOUNT_ID`                                       | variable (exists)          | set by `setup-services.sh`                                                                                                                                                                     |
| `TF_STATE_R2_ACCESS_KEY_ID`, `TF_STATE_R2_SECRET_ACCESS_KEY` | secrets                    | Cloudflare > R2 > Manage API tokens > Create: Object Read and Write, scoped to `stamina-tfstate` (the S3 credentials of the state backend)                                                      |
| `NEON_API_KEY`, `NEON_PROJECT_ID`                             | secret, variable (exist)   | set by `setup-services.sh`                                                                                                                                                                     |
| `NEON_DEV_BRANCH_ID`                                          | variable, optional         | the `br-...` id of the `dev` branch, see step 3 below                                                                                                                                          |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`                             | secret, variable           | Sentry (EU) > Settings > Developer Settings > Custom Integrations > Internal Integration; permissions Organization: Read, Project: Admin, Team: Admin (CI: Read). `SENTRY_ORG` is the organisation slug |
| `UPTIMEROBOT_API_KEY`, `ALERT_EMAIL`, `PROD_API_URL`          | local only                 | UptimeRobot > Integrations > API; Vang's email; the production API origin                                                                                                                      |
| `BREVO_API_KEY`, `SENDER_EMAIL`                               | local only                 | Brevo > SMTP & API > API keys; the From address                                                                                                                                                |
| `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`                          | local only                 | Brevo > SMTP & API > SMTP: the login, and "Generate a new SMTP key" (not the API key). Read by `neon-auth-setup.mjs`; Neon Auth stores them for its sign-in emails                              |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`        | local only, optional       | Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application). Read by `neon-auth-setup.mjs`; without them Neon's shared Google credentials stay (development only) |
| `CLOUDFLARE_API_TOKEN`                                        | secret (exists)            | Pages edit **plus Workers Scripts edit**; used by `wrangler` in the deploy workflows and `scripts/workers-deploy.mjs`. Created by hand: see "Runbook: Cloudflare token and Workers" below |

Plan-only CI also needs the secrets above that are not "local only". Any missing one makes `infra-plan.yml` skip the plan with a note and still run the other checks.

Outputs feed these repository variables (run `gh variable set NAME --body "$(...)"`), used by the release and backup workflows:

| Variable                        | Value                                                                  |
| ------------------------------- | ---------------------------------------------------------------------- |
| `SENTRY_DSN_API`, `SENTRY_DSN_WEB` | `tofu output -raw sentry_dsn_api` / `sentry_dsn_web` (run through `infra/tofu.sh production output -raw ...`) |
| `R2_BACKUP_BUCKET`              | `infra/tofu.sh production output -raw backup_bucket`                   |
| `R2_ENDPOINT`                   | `infra/tofu.sh production output -raw r2_endpoint`                     |
| `NEON_AUTH_BASE_URL`            | `node scripts/ops/neon-auth-setup.mjs --branch main --web-origin <PROD_WEB_URL>` prints it (the Neon Auth `base_url` of the production branch); see [auth.md](auth.md) |

## Bootstrap order (first time)

1. **Accounts and one-time console steps.** Run `scripts/setup-services.sh` (repo, Neon project and `dev` branch, Pages project and its API token). Create the Sentry organisation by hand with the **EU data region** (the region is chosen at sign-up and an integration token cannot create organisations), then the internal integration above. Enable R2 on the Cloudflare account.
2. **State bucket.** Put `TOFU_CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env` and run `infra/bootstrap.sh`. It creates `stamina-tfstate` in the EU jurisdiction, or does nothing if it exists. Then create the scoped R2 key it describes and put it in `.env` as `TF_STATE_R2_ACCESS_KEY_ID` / `TF_STATE_R2_SECRET_ACCESS_KEY`.
3. **Neon `dev` branch id.** `dev` is only ever adopted, never created here (a branch cut from `main` after launch would copy user data into the Preview parent). Find its id and put it in `.env` as `NEON_DEV_BRANCH_ID`:
   ```bash
   curl -s -H "Authorization: Bearer $NEON_API_KEY" \
     "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
     | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const b of JSON.parse(s).branches)console.log(b.id,b.name)})'
   ```
4. **Plan, then apply.** Also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `NEON_API_KEY`, `NEON_PROJECT_ID` in `.env`.
   ```bash
   infra/tofu.sh production init
   infra/tofu.sh production plan
   infra/tofu.sh production apply
   ```
   Expect the first plan to **import** the Pages project, the Neon project and `dev`, and to **create** the backup bucket and its lifecycle rule, the Sentry team, two projects and two client keys. A plan that wants to _replace_ or _destroy_ the Pages project or Neon project is wrong: stop (they carry `prevent_destroy` as a seatbelt).
5. **Repository variables** from the outputs (table above).
6. **Scripts**, after the first production deploy so `PROD_API_URL` is known:
   ```bash
   scripts/ops/uptimerobot-setup.sh --dry-run     # review, then run without --dry-run
   scripts/ops/brevo-setup.sh --dry-run           # review, then run without --dry-run
   node scripts/ops/neon-auth-setup.mjs --dry-run # sign-in: review, then run for dev and main (docs/auth.md has the runbook)
   ```
7. **Push alerts** (UptimeRobot): install the UptimeRobot mobile app and sign in as Vang; the API cannot register a device.

## Importing existing resources

The config adopts what already exists through `import` blocks, so no `tofu import` command is needed. They are driven by variables (`adopt_existing_resources`, default `true`) and are harmless once the resource is in state; delete them whenever you like.

| Resource                         | Import id                                               |
| -------------------------------- | ------------------------------------------------------- |
| `cloudflare_pages_project.web`   | `<account_id>/<project_name>`                           |
| `neon_project.stamina`           | the project id (`NEON_PROJECT_ID`)                      |
| `neon_branch.dev["dev"]`         | `<project_id>/<branch_id>` (needs `NEON_DEV_BRANCH_ID`) |
| `cloudflare_r2_bucket.backups`   | `<account_id>/<bucket>/eu`; set `import_existing_backup_bucket = true` if the bucket was made by hand |

Resources that did not exist before are created by apply. If one already exists, import it by hand, for example:

```bash
infra/tofu.sh production import sentry_team.stamina <org-slug>/<team-slug>
infra/tofu.sh production import sentry_project.web  <org-slug>/stamina-web
infra/tofu.sh production import cloudflare_dns_record.extra[\"key\"] <zone_id>/<record_id>
```

`cloudflare_r2_bucket_lifecycle` cannot be imported (provider limitation); applying overwrites the bucket's lifecycle rules with the one declared here.

Everything that could force a replacement of an adopted Pages or Neon project (region, Postgres version, build config, compute settings) is under `ignore_changes`; those are changed in the vendor console.

## Running plan and apply locally

```bash
infra/tofu.sh production plan
infra/tofu.sh production apply
```

`infra/tofu.sh` reads `.env`, maps the names above to what the providers and the S3 backend expect (`CLOUDFLARE_API_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_ENDPOINT_URL_S3`, `TF_VAR_*`) and runs `tofu -chdir=infra/envs/production ...`. Nothing is written to disk. A zone and extra DNS records go in `infra/envs/production/terraform.tfvars` (identifiers only, safe to commit; see `variables.tf`).

State is in `stamina-tfstate/production/terraform.tfstate` (EU jurisdiction) with a lock object beside it. R2 has no object versioning, so keep a copy before risky changes: `infra/tofu.sh production state pull > state-backup.tfstate` (gitignored; keep it out of the repo). The state holds no database passwords (`store_password = "no"`).

CI (`.github/workflows/infra-plan.yml`) runs on PRs that touch `infra/**` or the ops scripts (including `neon-auth-setup.mjs` and `workers-deploy.mjs`): shellcheck, the script tests, `tofu fmt -check`, `tofu validate`, `tofu test`, and, when its secrets exist, a read-only `tofu plan` posted as one sticky comment (credentials redacted). It never applies.

Offline checks you can run without any account:

```bash
tofu fmt -check -recursive infra
tofu -chdir=infra/envs/production init -backend=false && tofu -chdir=infra/envs/production validate
tofu -chdir=infra/envs/production test
node --test infra/test/ops-scripts.test.mjs
```

## Adding another environment or region

One full stack per region: its own Neon project, R2 bucket, API host region (Cloud Run or Deno Deploy at launch) and Pages project.

1. `cp -r infra/envs/production infra/envs/<name>` (without `.terraform/`).
2. In `versions.tf` change the backend `key` to `<name>/terraform.tfstate`.
3. Delete `sentry.tf` and the Sentry outputs and provider, unless this environment gets its own Sentry projects (then change the slugs): errors are separated by `SENTRY_ENVIRONMENT`, not by project.
4. Set `adopt_existing_resources = false` (it creates a new Neon project; set `neon_org_id` and `neon_region`) and give the Pages project and backup bucket their own names via variables.
5. Run `infra/bootstrap.sh` only if the state bucket is new (it is shared by default), then `infra/tofu.sh <name> init|plan|apply`.
6. Add the environment to the `infra-plan.yml` run steps (or a matrix) so its PRs are planned.

## Sentry settings OpenTofu cannot manage

Personal-data scrubbing is organisation-level and has no provider resource. In Sentry (EU) > Settings > Security & Privacy, turn **on**: Data Scrubber, Use Default Scrubbers, Prevent Storing of IP Addresses. The SDKs also scrub before sending (`send_default_pii` off, bodies and headers dropped); see the API and web error-reporting code.

## Budget alerts (€5) per account that holds a card

Rule: every account that holds a card gets a **€5 budget alert**, plus a hard cap where the provider offers one.

| Account                                | Card on file today?                                                                           | When a card is added                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Neon (free)                            | No                                                                                            | Billing: set a spend/consumption limit and an email alert at €5                                                                       |
| Cloudflare Workers (free)              | **No.** The Workers free plan needs no payment method (Phase A API host). Only R2 may ask for one. | Paid plan ($5/mo) only if the free limits are outgrown: set a usage alert at €5                                                       |
| Sentry Developer                       | No                                                                                            | Team plan: set the on-demand budget to 0 and a quota alert at €5                                                                      |
| UptimeRobot (free)                     | No                                                                                            | Paid plan: no usage billing, but note the renewal date                                                                                |
| Brevo (free, 300/day)                  | No                                                                                            | Paid plan: set the sending-limit alert and a budget alert at €5                                                                       |
| GitHub (Free)                          | No                                                                                            | Pro ($4/mo): Settings > Billing > Budgets and alerts, €5, and a $0 Actions spending limit                                             |
| Cloudflare                             | **Unverified: R2's checkout asks for payment details (R2 itself is free to 10 GB-month).** Treat the account as holding a card once R2 is enabled. | Notifications > Add > Usage Based Billing, threshold €5 (Pay-as-you-go accounts only; it needs the R2 subscription to exist)          |
| AI provider (chosen in the Generation engine ticket) | Not yet chosen                                                                                | Required before first use: a prepaid credit or a hard monthly cap at the provider, plus a €5 alert                                    |

Exact setting names change; confirm them in each console when you add a card, and tick the box in the ticket only then.

## Gaps until a domain exists

No domain is owned, so: no DNS record or Pages custom domain is created (`zone_id` is `null`; the web app is served at `stamina-web.pages.dev`, the API at its `*.workers.dev` hostname); Brevo domain authentication (SPF, DKIM, DMARC) is not set up, so sign-in emails come from a verified single sender address and may be spam-filtered; Sentry and UptimeRobot are unaffected. When a domain is bought: add it to Cloudflare, set `zone_id`, `web_hostname` and the Brevo DNS records via `dns_records` (see `variables.tf`), attach the API hostname in Deno Deploy, and re-run `brevo-setup.sh` and `uptimerobot-setup.sh` with the new `PROD_API_URL`.

## Unverified until applied with real credentials

Verified locally: `tofu fmt`, `validate`, `tofu test` (providers mocked), the S3 backend settings against an S3-compatible mock (init, apply, lock object via conditional write), every script's argument handling and find-or-create idempotency against mock HTTP servers, shellcheck, actionlint.

**Not verified against the real services** (no credentials were available when this was written):

- `tofu plan` and `apply` against Cloudflare, Neon and Sentry; in particular that the three `import` blocks read back cleanly with no unwanted diff, and that the `ignore_changes` lists cover every attribute the imported resources report differently.
- That R2 accepts the lifecycle rule as written, and that its conditional-write lock behaves like the mock (`use_lockfile`).
- The Sentry token permission names, the `deno` platform slug, and that `sentry_key.dsn["public"]` is present (documented by the provider).
- UptimeRobot: the v3 request shapes were taken from the published OpenAPI document (`https://cdn.uptimerobot.com/api/openapi.yaml`); the free plan accepting `httpMethodType: GET` and a 300 s interval, the pagination `nextLink` format, and the Email contact's `type` casing are unconfirmed.
- Brevo: endpoints and fields are from the reference pages; the SMTP key still has to be generated in the console.
- Workers (`scripts/workers-deploy.mjs`, `[INFERENCE]` list in its header): the Wrangler flags and output formats it relies on (`delete --force`, `--var KEY:VALUE` with URL values, `secret bulk` right after `deploy`, `rollback --message`, the version id line), and that a token with Workers Scripts Edit is enough. Not run against Cloudflare: the token available when it was written could not write Workers, and the account had no workers.dev subdomain.
- Cloudflare: that enabling R2 needs a card (see the budget table), and the exact token permission labels ("Workers Scripts" > Edit in the token form).
- Neon Auth: the management API calls of `scripts/ops/neon-auth-setup.mjs` (what its header lists as `[INFERENCE]`) and the sign-in flow itself; see [auth.md](auth.md), "Not yet verified live".

## Runbook: Cloudflare token and Workers

What only Vang can do (the token in `.env` can read Workers but cannot write them, and the account has no verified workers.dev subdomain). None of it needs a card.

1. **Create a token that can deploy Workers.** Cloudflare dashboard > My Profile > API Tokens > Create Token > Custom token > Get started. Permissions: **Account > Cloudflare Pages > Edit** (what the current token has) **and Account > Workers Scripts > Edit**. Account Resources: Include > your account. Continue to summary > Create Token, copy it (shown once). Editing the existing token (API Tokens > the token > Edit > add the permission row) works too and keeps its value.
2. **Store it.** Put it in `.env` as `CLOUDFLARE_API_TOKEN`, then `gh secret set CLOUDFLARE_API_TOKEN` (reads the value from the prompt; do not pass it on the command line). `CLOUDFLARE_ACCOUNT_ID` is already a variable.
3. **Register the free workers.dev subdomain** if the account has none: dashboard > Workers & Pages; the first visit asks you to pick a subdomain (free, no card). Check it:
   ```bash
   set -a; . ./.env; set +a
   curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain"   # {"result":{"subdomain":"..."}}
   ```
4. **Set `PROD_API_URL`** to `https://stamina-api.<subdomain>.workers.dev` (no trailing slash): `gh variable set PROD_API_URL --body "https://stamina-api.<subdomain>.workers.dev"`. The release preflight compares it with the subdomain Cloudflare reports.
5. **First production deploy.** Merge the release PR (or Actions > Release > Run workflow with a tag). The deploy step creates the Worker, uploads its secrets and checks `/health`. Then run `scripts/ops/uptimerobot-setup.sh` (monitor on `PROD_API_URL/health`) if it is not set up yet.
6. **Delete the unused Deno secrets and variables:** `gh secret delete DENO_DEPLOY_TOKEN`, `gh variable delete DENO_APP`, `gh variable delete DENO_ORG`, and remove `DENO_DEPLOY_TOKEN`, `DENO_APP`, `DENO_ORG` from `.env`.
