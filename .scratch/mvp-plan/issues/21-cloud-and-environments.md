# Cloud setup, environments, monitoring and cost guardrails

Type: grilling
Status: claimed
Blocked by: 06, 07, 20

## Question

What is the simplest automated cloud setup: IaC tool and repo layout, dev/staging/prod environments (and per-PR previews, incl. Neon database branches per environment), secrets management (incl. the field-encryption key), error monitoring and uptime (free tiers), logging without leaking health data, cost guardrails (budget alerts, hard caps, rate limits), and the path to multi-region (one full stack per region, per Data model)? Fixed inputs from Data model: Neon Postgres Frankfurt + Neon Auth; nightly encrypted `pg_dump` via scheduled GitHub Action to an EU-jurisdiction Cloudflare R2 bucket, 30-day retention, monthly restore test. Open here: which service sends sign-in email codes, and where API/compute runs so health data stays in, or is lawfully transferred from, the EU (hosting research: Cloudflare can't pin compute to the EU on free; Cloud Run and Deno Deploy can).

## Comments

- 2026-10-28: Fact-finding for this ticket: `docs/research/cloud-ops-free-tiers.md` on branch `research/cloud-ops-free-tiers` (commit `0166523`). Gist: Neon Auth's shared sender is not for production (bring SMTP); EU free email: Brevo 300/day (FR/DE, no card), Scaleway TEM 300/month, Mailjet 6k/month; Resend stores account data in the US. Sentry Developer free 5k errors with EU storage (de.sentry.io) and default scrubbing; paid Team $26/mo. UptimeRobot 50 monitors @ 5 min, commercial OK, no card. Hard spend caps: Anthropic, Cloud Run; OpenAI project limits; Neon Launch alerts only. Deno Deploy free 1M req, 20 GiB, 10 h CPU/month, region us/eu/global. Cloud Run free tier at Tier-1 prices (europe-west1 Tier 1). IaC: Cloudflare official, Deno official v0.1.0, Neon community (Neon-sponsored), Sentry community; R2 documented as state backend. GitHub Free private repos: no environment secrets or protection rules; repository secrets work.
