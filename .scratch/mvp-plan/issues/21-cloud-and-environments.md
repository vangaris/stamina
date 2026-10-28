# Cloud setup, environments, monitoring and cost guardrails

Type: grilling
Status: claimed
Blocked by: 06, 07, 20

## Question

What is the simplest automated cloud setup: IaC tool and repo layout, dev/staging/prod environments (and per-PR previews, incl. Neon database branches per environment), secrets management (incl. the field-encryption key), error monitoring and uptime (free tiers), logging without leaking health data, cost guardrails (budget alerts, hard caps, rate limits), and the path to multi-region (one full stack per region, per Data model)? Fixed inputs from Data model: Neon Postgres Frankfurt + Neon Auth; nightly encrypted `pg_dump` via scheduled GitHub Action to an EU-jurisdiction Cloudflare R2 bucket, 30-day retention, monthly restore test. Open here: which service sends sign-in email codes, and where API/compute runs so health data stays in, or is lawfully transferred from, the EU (hosting research: Cloudflare can't pin compute to the EU on free; Cloud Run and Deno Deploy can).
