# 04: Sign-in through app-core

**What to build:** A person can create an account and sign in with an emailed one-time code or Google, with no password, and every client data operation already flows container → composable → mediator → handler → factory-built service.

**Blocked by:** 01: Walking skeleton, 03: Theme tokens, core UI kit and i18n

**Status:** in-progress

**Roadmap week:** 2

- [x] app-core package introduced (no Vue or React imports): mediator with typed commands and queries, pipeline steps (validate, log-safe, offline queue, error map, timing), createServices for production, test and dev
- [ ] Neon Auth handles email one-time codes (sent through Brevo SMTP from EU servers) and Google sign-in
- [x] User row created on first sign-in; row-level security restricts every user-owned table to its owner, proven by an API test where user B cannot read user A
- [x] Sign-in screen built as a container calling one composable; presentational components only receive props and emit events
- [x] Mediator tests cover the sign-in command's success and error mapping; Playwright covers email-code sign-in locally against a fake auth server (the run on a live preview moves to ticket 25)
- [x] No password storage anywhere

## Open (needs live services, see `docs/auth.md` runbook)

- Box 2 (Neon Auth email codes through Brevo SMTP, Google): the email code works against the live `dev` branch (verified 2026-10-31). Google sign-in through the proxy is not verified yet; it needs the redirect URIs added in Google Cloud Console and one click-through.
- Box 5 (reworded 2026-10-31): done. The live-preview run moved to ticket 25 because Deno Deploy suspended the organisation and asks for a card; Phase A needs none.
- Unverified assumptions are listed in `docs/auth.md` ("Not yet verified live").
