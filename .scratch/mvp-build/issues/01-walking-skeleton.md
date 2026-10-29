# 01: Walking skeleton

**What to build:** A deployable, testable empty Stamina: the Vue PWA shell with labelled bottom tabs (Today · Session · Meals · Progress) loads on a phone and calls the Hono API's health endpoint running on Deno Deploy EU against a Neon database. Every pull request gets its own preview (web + API + database branch) and a green CI run. All three test seams have working harnesses.

**Blocked by:** None (can start immediately)

**Status:** in-progress

**Roadmap week:** 1

- [x] pnpm + Nx monorepo with the agreed package layout and module-boundary tags; lint fails on a boundary violation
- [x] Web app installs as a PWA (manifest + service worker) and renders the four tabs at phone width
- [x] API exposes a health endpoint that checks database connectivity; Drizzle is set up with forward-only migrations
- [ ] CI on every PR runs nx affected lint, typecheck, tests and build, plus Gitleaks and OSV-Scanner, and stays within the free Actions minutes
- [ ] Each PR deploys a preview: Cloudflare Pages + Deno Deploy + a Neon branch with migrations applied; the branch is deleted on merge
- [x] Seam 1 harness: an API test boots the real Hono app against real Postgres with a fake AI provider and passes a health test
- [x] Seam 2 harness: a mediator test with mock services passes a trivial query
- [ ] Seam 3 harness: one Playwright smoke test (phone viewport + axe) passes against the preview
- [ ] PR template with the Stamina checklist, issue forms, CODEOWNERS for safety-critical paths, Conventional PR-title check
