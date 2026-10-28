# Cloud setup, environments, monitoring and cost guardrails

Type: grilling
Status: resolved
Blocked by: 06, 07, 20

## Question

What is the simplest automated cloud setup: IaC tool and repo layout, dev/staging/prod environments (and per-PR previews, incl. Neon database branches per environment), secrets management (incl. the field-encryption key), error monitoring and uptime (free tiers), logging without leaking health data, cost guardrails (budget alerts, hard caps, rate limits), and the path to multi-region (one full stack per region, per Data model)? Fixed inputs from Data model: Neon Postgres Frankfurt + Neon Auth; nightly encrypted `pg_dump` via scheduled GitHub Action to an EU-jurisdiction Cloudflare R2 bucket, 30-day retention, monthly restore test. Open here: which service sends sign-in email codes, and where API/compute runs so health data stays in, or is lawfully transferred from, the EU (hosting research: Cloudflare can't pin compute to the EU on free; Cloud Run and Deno Deploy can).

## Comments

- 2026-10-28: Fact-finding for this ticket: `docs/research/cloud-ops-free-tiers.md` on branch `research/cloud-ops-free-tiers` (commit `0166523`). Gist: Neon Auth's shared sender is not for production (bring SMTP); EU free email: Brevo 300/day (FR/DE, no card), Scaleway TEM 300/month, Mailjet 6k/month; Resend stores account data in the US. Sentry Developer free 5k errors with EU storage (de.sentry.io) and default scrubbing; paid Team $26/mo. UptimeRobot 50 monitors @ 5 min, commercial OK, no card. Hard spend caps: Anthropic, Cloud Run; OpenAI project limits; Neon Launch alerts only. Deno Deploy free 1M req, 20 GiB, 10 h CPU/month, region us/eu/global. Cloud Run free tier at Tier-1 prices (europe-west1 Tier 1). IaC: Cloudflare official, Deno official v0.1.0, Neon community (Neon-sponsored), Sentry community; R2 documented as state backend. GitHub Free private repos: no environment secrets or protection rules; repository secrets work.
- 2026-10-28 rounds 1–2 (Vang accepted all recommendations Q1–Q13).

## Answer

**Environments**

| Environment | App | Database |
|---|---|---|
| Local | Vang's machine | Neon `dev` branch |
| Preview (one per PR) | Preview frontend + preview API | Its own Neon branch from `dev`, deleted on merge |
| Production | Live | Neon `main` branch |

No long-lived staging until there are paying users.

**Runtime**
- **Frontend**: static files on **Cloudflare Pages**. No health data; free tier allows commercial use; previews per PR.
- **API**: a portable web-standard TypeScript app (**Hono**) on **Deno Deploy, EU region**, next to Neon Frankfurt. Free: 1M requests, 20 GiB egress, 10 h CPU per month, hard free limits.
- **Scale path**: **Cloud Run, europe-west1**. The free tier applies there and spend caps are real hard caps; the same Hono app moves over unchanged.

**Services and first paid thresholds**

| Service | Choice | Free tier used | First paid threshold |
|---|---|---|---|
| Frontend hosting | Cloudflare Pages | Commercial use, previews per PR | Build or request limits (see the hosting research) → Workers Paid $5/mo |
| API | Deno Deploy (EU) | 1M req, 20 GiB, 10 h CPU / month | Over those limits → Pro $20/mo, or Cloud Run pay-per-use |
| Database + auth | Neon Frankfurt + Neon Auth | per Data model | per Data model |
| Backups / IaC state | Cloudflare R2 (EU jurisdiction) | 10 GB-month | > 10 GB |
| Sign-in email codes | **Brevo** (EU servers, SMTP into Neon Auth); fallback Scaleway TEM | 300/day, no card | > 300/day (Brevo paid price UNVERIFIED; check before launch) |
| Error tracking | **Sentry Developer, EU region** (`de.sentry.io`) | 5k errors/mo, 1 user, server-side scrubbing | > 5k errors or a 2nd user → Team $26/mo |
| Uptime | **UptimeRobot** | 50 monitors @ 5 min, commercial OK, no card | None at MVP scale |

**Logging**
- Structured logs with **allowlisted fields only**: request ID, route, status, latency, pseudonymous user ID, error type.
- Never request or response bodies; never Check-in, screening or meal content.
- Error reports are scrubbed before sending. Logs are kept 14 days.

**Monitoring** (nothing else until there are paying users):
1. Sentry on the frontend and API.
2. An UptimeRobot check on the API `/health` every 5 min, alerting Vang by email and push.
3. A daily automated digest: sign-ups, Check-ins, AI cost to date, nightly backup result, monthly restore-test result.

**Cost guardrails: never an unlimited bill**
- Prefer hard-limited, no-card free tiers.
- Every account that holds a card gets a **€5 budget alert**, plus a hard cap where the provider offers one.
- AI spend is capped three ways:
  1. at the **provider**: a hard monthly cap or prepaid credit, required of whichever provider the Generation engine picks;
  2. **per user per day**, enforced from the LLM_CALL ledger;
  3. by a **global daily kill switch** that falls back to rule-built Sessions and fixed meal templates.
- Per-user API rate limits.

**Secrets**
- GitHub Free private repos have no environment secrets or protection rules. So CI deploy keys go in repository secrets, and runtime secrets live in each platform's environment settings (Deno Deploy, Cloudflare Pages).
- Previews get separate non-production keys.
- The field-encryption key exists only in Deno production settings, plus an offline copy in Vang's password manager.
- No separate secrets manager.

**Infrastructure as code**
- **OpenTofu**, state in R2 using Cloudflare's documented S3 backend. One `infra/` folder, one config per environment.
- OpenTofu manages Cloudflare (official provider), Neon (community, Neon-sponsored) and Sentry (community).
- Deno Deploy (official provider is still v0.1.0), UptimeRobot and Brevo get scripted setup steps in `infra/`.
- App deploys run in GitHub Actions, not OpenTofu.

**Multi-region**: one full stack per region (per Data model). Each region is one OpenTofu environment plus its own Neon project, R2 bucket and Deno/Cloud Run region.

**Propagated**
- Generation engine: the provider must have a hard cap or prepaid credit; the kill-switch fallback.
- Nutrition and hydration logic: fixed meal templates, needed as the kill-switch fallback.
- Engineering process: GitHub Free private-repo limits, the CI jobs this setup needs, and branch protection (GitHub Pro $4/mo is a candidate first paid threshold).
- Fog "API style" is narrowed: a custom Hono API is decided; only the contract style remains.
