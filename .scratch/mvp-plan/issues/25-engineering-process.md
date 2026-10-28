# Engineering process: branches, CI/CD, ticket-PR-release linking, Dependabot, secret scanning

Type: grilling
Status: resolved
Blocked by: 07, 19

## Question

How does work flow on GitHub as the single source of truth: Issues + Projects board columns and fields, issue and PR templates, branch strategy (trunk-based vs short-lived feature branches), commit convention, GitHub Actions pipelines (lint, typecheck, test, build, preview deploy per PR, prod deploy on tag/merge), auto-linking tickets to PRs to releases (closing keywords, release notes generation), Dependabot, secret scanning and push protection, branch protection — and which of these are free for a private repo on the free plan? Fixed by Cloud setup: per-PR previews (Cloudflare Pages + Deno Deploy + a Neon branch per PR, deleted on merge), production deploy of the Hono API to Deno Deploy EU and the frontend to Cloudflare Pages, OpenTofu plan/apply for `infra/`, the nightly encrypted `pg_dump` to R2, and a monthly restore test. Fixed by Delivery platform: pnpm + Nx monorepo with one package per UI component and per shared utility; CI runs `nx affected` lint (incl. module-boundary tags), typecheck, Vitest, build, Playwright on previews, axe, and the engine's eval set on prompt changes; React Native/EAS pipelines arrive with post-MVP 01. Known limit: GitHub Free private repos have no environment secrets or deployment protection rules (repository secrets only); decide whether branch protection needs GitHub Pro ($4/mo, a candidate first paid threshold).

## Comments

- 2026-10-28 (Vang): unblocked from Install gh and move the repo and map to GitHub; conventions are decided here and applied when the repo is created.
- 2026-10-28 round 1 (Vang accepted all recommendations Q1–Q9). Facts checked on GitHub docs:
  - **Secret scanning**: not available for user-owned private repos on Free or Pro.
  - **Actions**: GitHub Free includes $12/month of compute (≈ 2,000 Linux 2-core minutes at $0.006). Without a payment method, usage is blocked when it runs out. Dependabot runs are free.
  - **UNVERIFIED** in the fetched pages: whether branch protection / rulesets apply to private repos on Free; CodeQL availability on private personal repos.

## Answer

**Board (GitHub Projects)**
- **Columns**: Backlog → Ready → In progress → In review → Done.
- **Fields**: Type (feature / bug / chore / spike) · Area (web / api / domain / app-core / ui / infra / content) · Build week (1–8) · Size (S ≈ 2 h / M ≈ 4 h / L ≈ 8 h) · Increment (MVP / 1 / 2 / 3) · Release.
- **Automation**: opened → Backlog; PR opened → In review; closed → Done.
- Implementation issues come from `/to-spec` → `/to-tickets` after this plan.

**Templates**
- **Issue forms**: feature (user story + acceptance criteria), bug (steps / expected / actual), chore.
- **PR template**: `Closes #N`; what/why; test evidence; migration notes; **Stamina checklist**:
  - no health data in logs, analytics or LLM prompts;
  - copy follows the never-advise list and the food-claim rules;
  - EN + EL strings added;
  - semantic tokens only.

**Branches and commits**
- Trunk-based; short-lived `type/<issue#>-slug` branches.
- Squash merge only; linear history; branches deleted on merge.
- `main` is always deployable; unfinished screens sit behind feature flags.
- PR titles follow Conventional Commits, enforced by commitlint (the squash commit message is the PR title).

**CI/CD (GitHub Actions)**

| Trigger | Jobs |
|---|---|
| Pull request | `nx affected` lint (incl. module boundaries), typecheck, Vitest, build; **Gitleaks**; **OSV-Scanner**; preview deploy (Cloudflare Pages + Deno Deploy + Neon branch with migrations applied); **Playwright + axe** on the preview; LLM eval set if prompts changed; `tofu plan` comment if `infra/` changed |
| Merge to `main` | **release-please** opens or updates the release PR (version + changelog) |
| Release PR merged | tag → production DB migrations → deploy API (Deno Deploy EU) → deploy web (Cloudflare Pages) → `/health` smoke check |
| Schedules | nightly encrypted `pg_dump` → R2; monthly restore test; daily-reminder fallback trigger |

- **Budget**: ≈ 2,000 free minutes/month ≈ 200 PR runs at ~10 min, with Nx caching.
- **Hard stop**: when the minutes run out, Actions stops; no card is on file.

**Ticket ↔ PR ↔ release**
- `Closes #N` auto-closes the issue and moves the card.
- release-please changelogs list PRs (and so issues).
- The board's Release field records the version.

**Security**
- **Dependabot**: alerts + weekly grouped updates for npm and GitHub Actions.
- **Gitleaks**: in CI and as a lefthook pre-commit hook, replacing GitHub secret scanning, which is unavailable here.
- **OSV-Scanner** in CI.
- **CodeQL skipped** (availability unverified).

**Protecting `main`**
- Rules: PR required, PR checks required, linear history, no force push.
- If GitHub Free doesn't allow this on a private repo, **[Vang] buys GitHub Pro, US$4/month**, at repo creation. That would be the first paid tool.
- Until then, a pre-push hook blocks direct pushes to `main`.

**AI agents**
- Agents work on branches and open PRs labelled `agent`; Vang reviews and merges every PR.
- CODEOWNERS + checklist require Vang's explicit sign-off note on safety-critical paths:
  - Screening and stop-flag rules in `packages/domain`;
  - copy files;
  - LLM prompts and validators;
  - DB migrations.

**Database migrations**
- **Drizzle ORM + drizzle-kit**: forward-only migrations in the repo.
- Applied on the PR's Neon branch, then on production at release.
- Row-level security policies live in the migrations.

**Propagated**: Install gh and move the repo and map to GitHub now carries the repo bootstrap (settings, board, templates, labels, protection check).
