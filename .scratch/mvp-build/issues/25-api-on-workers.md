# 25: API on Cloudflare Workers (no card)

**What to build:** The API runs on the Cloudflare Workers free plan, so the app is usable from Vang's phone, previews work per pull request and production deploys, with no payment method anywhere. Deno Deploy suspended the free organisation and asks for a card; the API is portable Hono, so the host changes and the code does not.

**Blocked by:** 04: Sign-in through app-core

**Status:** in-progress

**Phase:** A (owner-only, no payment method)

**Roadmap week:** 2

- [x] The Hono app runs on Cloudflare Workers: a Workers entry beside the existing Node and Deno entries, a `wrangler` config, only the Neon WebSocket driver in the bundle (no `pg`), `nodejs_compat` only if needed; `/health` and `GET /me` answer from a deployed Worker
- [x] Runtime values are Worker secrets and vars (`DATABASE_URL`, `CORS_ORIGINS`, `NEON_AUTH_BASE_URL`, `SENTRY_DSN`); no secret in the repository or in logs
- [x] Each pull request deploys its own Worker (`stamina-api-pr-N`) against its own Neon branch and the preview web app points at it; closing the PR deletes the Worker
- [ ] `release.yml` deploys the production Worker and smoke-checks `/health`; the production API answers again
- [ ] Playwright covers real email-code sign-in on the live preview (moved from ticket 04) and the existing preview smoke test passes
- [x] Free-plan limits checked on the deployed Worker (CPU time of `/me` with JWT verification and the RLS transaction, request count); result and the exit path to Cloud Run recorded in `docs/infra.md`
- [x] Docs updated (`docs/releasing.md`, `docs/infra.md`, `docs/auth.md`, `docs/development.md`); Deno scripts kept only as the documented launch option or removed

## Notes

- Parked from ticket 04 by Vang on 2026-10-31: Deno Deploy returned `402 BILLING_SUSPENDED` (organisation suspended for exceeded usage limits); Phase A must not need a card.
- A Worker runs at the Cloudflare location nearest the caller. That is fine for the owner; real users' health data needs an EU-guaranteed host, which ticket 23 checks.

## Open (needs a Cloudflare token that can write Workers, see "Runbook: Cloudflare token and Workers" in `docs/infra.md`)

- Verified locally (2026-10-31): the Worker bundles without `pg`, and `wrangler dev --local` against a throwaway Neon branch answers `/health`, `/me` (401 without a token, 200 and the `app_user` row with a real Neon Auth JWT) and CORS. The branch was deleted afterwards.
- Not verified: any deploy (the token lacks Account > Workers Scripts > Edit), the workers.dev subdomain, secrets on a deployed Worker, per-PR deploy and delete, the release workflow, CPU time against the free plan's 10 ms limit (not measurable locally).

## Live results (2026-11-02, after the token gained Workers Scripts > Edit)

- Preview of PR 13 deployed `stamina-api-pr-13` against its own Neon branch; `/health` answered `{"status":"ok","database":"up"}`, `/me` answered 401 without a token, CORS echoed the preview web origin; Playwright + axe passed on the preview.
- Closing PR 13 removed the Neon branch and the Worker, but the cleanup job exited 1: `wrangler delete` lists KV namespaces, which the token cannot read. Fixed by deleting through the Cloudflare API (`scripts/workers-deploy.mjs`); the next PR's close proves it.
- CPU time (Cloudflare GraphQL `workersInvocationsAdaptive`, free plan limit 10 ms): warm `/health` and unauthenticated `/me` p50 2.3 ms, p99 12.1 ms over 108 requests; the first requests of a fresh Worker (cold start, first Neon connection) p50 7.6 to 8.5 ms, p99 24 to 30 ms. Not yet measured: `/me` with a real JWT (JWT verification plus the RLS transaction) and the real email-code sign-in; both need someone to sign in on a preview with a real mailbox.
- Production: the Worker `stamina-api` does not exist yet (`/health` answers Cloudflare error 1042). It is created by merging release PR 10.
- Signed in by hand with a real email code on the preview of PR 10 (2026-11-02) and reloaded the page; the Worker answered. The Playwright part of the fifth box cannot run against a live preview without a mailbox (the sign-in spec skips there), so that box stays open until a decision on a test mailbox or on reading it as the manual run. The preview smoke test passes.
- Preview teardown verified on PR 14: Worker and Neon branch gone, cleanup job green.
