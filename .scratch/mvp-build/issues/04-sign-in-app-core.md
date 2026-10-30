# 04: Sign-in through app-core

**What to build:** A person can create an account and sign in with an emailed one-time code or Google, with no password, and every client data operation already flows container → composable → mediator → handler → factory-built service.

**Blocked by:** 01: Walking skeleton, 03: Theme tokens, core UI kit and i18n

**Status:** in-progress

**Roadmap week:** 2

- [ ] app-core package introduced (no Vue or React imports): mediator with typed commands and queries, pipeline steps (validate, log-safe, offline queue, error map, timing), createServices for production, test and dev
- [ ] Neon Auth handles email one-time codes (sent through Brevo SMTP from EU servers) and Google sign-in
- [ ] User row created on first sign-in; row-level security restricts every user-owned table to its owner, proven by an API test where user B cannot read user A
- [ ] Sign-in screen built as a container calling one composable; presentational components only receive props and emit events
- [ ] Mediator tests cover the sign-in command's success and error mapping; Playwright covers email-code sign-in on the preview
- [ ] No password storage anywhere
