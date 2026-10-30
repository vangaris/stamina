# 04: Sign-in through app-core

**What to build:** A person can create an account and sign in with an emailed one-time code or Google, with no password, and every client data operation already flows container → composable → mediator → handler → factory-built service.

**Blocked by:** 01: Walking skeleton, 03: Theme tokens, core UI kit and i18n

**Status:** in-progress

**Roadmap week:** 2

- [x] app-core package introduced (no Vue or React imports): mediator with typed commands and queries, pipeline steps (validate, log-safe, offline queue, error map, timing), createServices for production, test and dev
- [ ] Neon Auth handles email one-time codes (sent through Brevo SMTP from EU servers) and Google sign-in
- [x] User row created on first sign-in; row-level security restricts every user-owned table to its owner, proven by an API test where user B cannot read user A
- [x] Sign-in screen built as a container calling one composable; presentational components only receive props and emit events
- [ ] Mediator tests cover the sign-in command's success and error mapping; Playwright covers email-code sign-in on the preview
- [x] No password storage anywhere

## Open (needs live services, see `docs/auth.md` runbook)

- Box 2 (Neon Auth email codes through Brevo SMTP, Google): code, setup script (`scripts/ops/neon-auth-setup.mjs`) and workflows are in place; nothing has run against live Neon, Brevo or Google. Needs the Brevo SMTP key and a Google OAuth client from Vang.
- Box 5: the mediator tests are done; the Playwright email-code journey passes locally against a fake Better Auth server (`apps/web/e2e/sign-in.spec.ts`). The run on the live PR preview is not done (needs box 2 first).
- Unverified assumptions are listed in `docs/auth.md` ("Not yet verified live").
