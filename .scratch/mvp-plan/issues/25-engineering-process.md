# Engineering process: branches, CI/CD, ticket-PR-release linking, Dependabot, secret scanning

Type: grilling
Status: open
Blocked by: 07, 19, 24

## Question

How does work flow on GitHub as the single source of truth: Issues + Projects board columns and fields, issue and PR templates, branch strategy (trunk-based vs short-lived feature branches), commit convention, GitHub Actions pipelines (lint, typecheck, test, build, preview deploy per PR, prod deploy on tag/merge), auto-linking tickets to PRs to releases (closing keywords, release notes generation), Dependabot, secret scanning and push protection, branch protection — and which of these are free for a private repo on the free plan? Fixed by Cloud setup: per-PR previews (Cloudflare Pages + Deno Deploy + a Neon branch per PR, deleted on merge), production deploy of the Hono API to Deno Deploy EU and the frontend to Cloudflare Pages, OpenTofu plan/apply for `infra/`, the nightly encrypted `pg_dump` to R2, and a monthly restore test. Fixed by Delivery platform: pnpm + Nx monorepo with one package per UI component and per shared utility; CI runs `nx affected` lint (incl. module-boundary tags), typecheck, Vitest, build, Playwright on previews, axe, and the engine's eval set on prompt changes; React Native/EAS pipelines arrive with post-MVP 01. Known limit: GitHub Free private repos have no environment secrets or deployment protection rules (repository secrets only); decide whether branch protection needs GitHub Pro ($4/mo, a candidate first paid threshold).
