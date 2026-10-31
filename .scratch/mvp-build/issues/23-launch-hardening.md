# 23: Launch hardening and go/no-go

**What to build:** The release candidate is proven ready for real users: every journey passes, the AI gate holds, the safety nets are tested, and the go/no-go checklist is complete.

**Blocked by:** 02: Release, infrastructure and ops pipeline, 15: Today timeline and Progress, 19: Reminders and iOS install guide, 22: Greek localisation complete, 24: R2 backups, restore test and OpenTofu state

**Status:** ready-for-agent

**Phase:** B (launch: other users, production data, payment methods)

**Roadmap week:** 8

- [ ] All five Playwright journeys pass with axe on the production-like preview: onboarding → reveal (incl. referral), offline Session → sync, 'I played' → accept, meal + water logging, EL smoke
- [ ] AI evaluation set ≥ 98 % validator pass in CI
- [ ] Kill switch tested: forcing the cap serves rules-only Sessions and templates
- [ ] Restore test passed within the last 30 days
- [ ] Go/no-go checklist ticked: physio and dietitian sign-offs, lawyer findings closed, DPIA final, processor DPAs accepted, HDPA portal access, privacy@ live
- [ ] Wave-1 invite codes ready for ~30 users in batches of 10
- [ ] The API runs on an EU-guaranteed host (Cloud Run europe-west1 or Deno Deploy EU): the Phase A Cloudflare Worker on the free plan does not promise EU processing
- [ ] Phase B payment items done: Anthropic key with its monthly hard cap and a €5 alert, R2 enabled, subscriptions decision recorded
