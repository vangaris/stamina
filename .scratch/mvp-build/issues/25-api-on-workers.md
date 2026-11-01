# 25: API on Cloudflare Workers (no card)

**What to build:** The API runs on the Cloudflare Workers free plan, so the app is usable from Vang's phone, previews work per pull request and production deploys, with no payment method anywhere. Deno Deploy suspended the free organisation and asks for a card; the API is portable Hono, so the host changes and the code does not.

**Blocked by:** 04: Sign-in through app-core

**Status:** in-progress

**Phase:** A (owner-only, no payment method)

**Roadmap week:** 2

- [ ] The Hono app runs on Cloudflare Workers: a Workers entry beside the existing Node and Deno entries, a `wrangler` config, only the Neon WebSocket driver in the bundle (no `pg`), `nodejs_compat` only if needed; `/health` and `GET /me` answer from a deployed Worker
- [ ] Runtime values are Worker secrets and vars (`DATABASE_URL`, `CORS_ORIGINS`, `NEON_AUTH_BASE_URL`, `SENTRY_DSN`); no secret in the repository or in logs
- [ ] Each pull request deploys its own Worker (`stamina-api-pr-N`) against its own Neon branch and the preview web app points at it; closing the PR deletes the Worker
- [ ] `release.yml` deploys the production Worker and smoke-checks `/health`; the production API answers again
- [ ] Playwright covers real email-code sign-in on the live preview (moved from ticket 04) and the existing preview smoke test passes
- [ ] Free-plan limits checked on the deployed Worker (CPU time of `/me` with JWT verification and the RLS transaction, request count); result and the exit path to Cloud Run recorded in `docs/infra.md`
- [ ] Docs updated (`docs/releasing.md`, `docs/infra.md`, `docs/auth.md`, `docs/development.md`); Deno scripts kept only as the documented launch option or removed

## Notes

- Parked from ticket 04 by Vang on 2026-10-31: Deno Deploy returned `402 BILLING_SUSPENDED` (organisation suspended for exceeded usage limits); Phase A must not need a card.
- A Worker runs at the Cloudflare location nearest the caller. That is fine for the owner; real users' health data needs an EU-guaranteed host, which ticket 23 checks.
