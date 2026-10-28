# Cloud ops free tiers: email, monitoring, guardrails, runtime, IaC, secrets

All sources were accessed on 2026-10-28. **UNVERIFIED** means the claim could not be confirmed from a primary source during this pass. **[INFERENCE]** marks the author's own reasoning. This note records facts only and makes no product decisions.

## Answer

- **Neon Auth** sends OTP/verification codes itself, through a shared SMTP sender (`auth@mail.myneon.app`). Neon's production checklist says to replace it with your own SMTP provider or webhook-driven provider. So a transactional email provider is needed for production, but not for development.
- **EU-hosted email providers with a usable free tier:** Brevo (300 emails/day, EU servers in France and Germany, no card required), Scaleway TEM (300 emails/month), and Mailjet (6,000/month, max 200/day). Resend's free plan gives 3,000/month (max 100/day). It can send from Ireland, but Resend stores all account data and logs in the US.
- **Error monitoring:** Sentry Developer is free for 1 user, includes 5k errors, and can use EU storage in Frankfurt (`de.sentry.io`). GlitchTip hosted is free for 1,000 events/month on an EU instance in Germany. Better Stack's free tier includes 100k exceptions.
- **Uptime monitoring:** UptimeRobot's free plan gives 50 monitors at a 5-minute interval, allows commercial use, and requires no card. Better Stack's free tier gives 10 monitors. Checkly Hobby is $0 with 10k API check runs/month.
- **Hard spend caps:** Anthropic (monthly spend cap per tier, plus a self-set limit) and GCP for Cloud Run (spend-cap budgets for a single project and service). GlitchTip offers an on-demand spend cap. OpenAI has configurable spend limits. Neon Launch only has spending *notifications*.
- **Deno Deploy (new) Free plan:** 1M requests, 20 GiB egress and 10 h of active CPU per month. Region can be set to `us`, `eu` or `global`, and Node apps have "full support". Cloud Run's free tier is computed on us-central1 pricing and applies as a discount on Tier 1 regions, which include europe-west1. Whether europe-west3 is Tier 1 is UNVERIFIED.
- **IaC:** official Terraform providers exist for Cloudflare (`cloudflare/cloudflare`) and Deno (`denoland/deno` v0.1.0, an early version). Neon's provider is community-built but Neon-sponsored. Sentry's provider (`jianyuan/sentry`) is a community provider. Cloudflare documents R2 as a Terraform S3-compatible remote backend; the R2 free tier (10 GB-month) covers state storage.
- **GitHub Free private repos:** they do **not** get environment secrets, required reviewers, wait timers or deployment branch rules. Those need Pro or Team. Repository-level Actions secrets still work. A third-party secrets manager is optional [INFERENCE].

## Q1 Transactional email

| Provider | Free volume | EU region | Card on free | First paid tier | Source |
|---|---|---|---|---|---|
| Resend | 3,000/month, 100/day | Can send from eu-west-1 (Ireland). Account data, metadata and logs are stored in the US regardless of sending region | Free-forever plan; card requirement UNVERIFIED | Pro $20/month for 50k emails, then $0.90 per 1k | resend.com/pricing; resend.com/docs/dashboard/domains/regions |
| Postmark | 100/month ("test your integration") | UNVERIFIED | "No Credit Card Required" | Basic 10k tier; price UNVERIFIED | postmarkapp.com/pricing |
| Brevo | 300/day, after account approval | EU servers in France and Germany (Brevo's own claim) | "Free forever, no credit card needed" | Starter; price UNVERIFIED on the pricing page | brevo.com/pricing; brevo.com/resend |
| Amazon SES | No permanent free tier. New AWS accounts get up to $200 in Free Tier credits | eu-central-1 and other EU regions exist (UNVERIFIED this pass) | AWS account needs a payment method (UNVERIFIED) | $0.10 per 1,000 emails | aws.amazon.com/ses/pricing |
| Scaleway TEM | 300/month, then €0.25 per 1k | Scaleway is an EU provider; TEM region UNVERIFIED | UNVERIFIED | €80/month for 100k | scaleway.com/en/transactional-email-tem |
| Mailjet | 6,000/month, 200/day | UNVERIFIED | UNVERIFIED | UNVERIFIED | mailjet.com/pricing |

Notes for all rows:

- Whether commercial use is allowed on the free tier and the DPA terms are UNVERIFIED for every provider in this pass. None of the pricing pages fetched forbade commercial use.
- Neon Auth (managed Better Auth) uses shared SMTP by default. Verification codes and password resets work with either the shared sender or a custom provider. Verification *links* require a custom provider. Branded email can go through webhooks to Resend, Postmark or any SMTP service. Sources: neon.com/docs/auth/production-checklist and neon.com/docs/auth/guides/customize-emails.

## Q2 Error monitoring

| Tool | Free quota | EU region on free | PII scrubbing | Card | First paid tier |
|---|---|---|---|---|---|
| Sentry Developer | 1 user, 5k errors, 1 uptime monitor | EU storage in Frankfurt (`de.sentry.io`), chosen per organization; availability on Developer is not stated as restricted (UNVERIFIED) | Server-side data scrubbing is on by default, plus "Additional Sensitive Fields" and Advanced Data Scrubbing rules | UNVERIFIED | Team $26/month (50k errors) |
| GlitchTip hosted | 1,000 events/month | "All plans available on our EU instance" (Germany) | UNVERIFIED | UNVERIFIED | Small plan; price UNVERIFIED. Opt-in on-demand billing has a hard spend cap |
| Better Stack | 100,000 exceptions/month; 10 monitors and heartbeats; 1 status page | UNVERIFIED | UNVERIFIED | UNVERIFIED | Overage $0.000050–0.000175 per exception |
| Highlight / LaunchDarkly | UNVERIFIED (not researched in this pass) | – | – | – | – |

Sources: sentry.io/pricing; docs.sentry.io/pricing; docs.sentry.io/organization/data-storage-location; docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing; glitchtip.com/pricing; betterstack.com/pricing.

## Q3 Uptime monitoring

| Tool | Free monitors / interval | Commercial use | Card on free |
|---|---|---|---|
| UptimeRobot | 50 monitors at 5 minutes; 1 status page; 3 months of data retention | Yes ("available for any use, including commercial") | No card required |
| Better Stack Uptime | 10 monitors and heartbeats; free interval UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Checkly Hobby | $0; 10k API check runs and 1k browser check runs per month | UNVERIFIED | UNVERIFIED |
| Sentry Uptime | 1 uptime monitor included | – | – |
| Cloudflare health checks | UNVERIFIED (believed to be a paid-plan feature) | – | – |

Sources: uptimerobot.com/pricing.md; help.uptimerobot.com (article "Who Should Use UptimeRobot's Free Plan?"); checklyhq.com/pricing; betterstack.com/pricing.

## Q4 Cost guardrails

| Service | Card needed on free | Hard cap or alerts only |
|---|---|---|
| Cloudflare R2 | R2 free tier: 10 GB-month, 1M Class A operations, free egress. Card requirement UNVERIFIED (enabling R2 typically asks for a payment method) | UNVERIFIED; no cap feature found |
| Cloudflare Pages / Workers | UNVERIFIED | Workers Free has hard request limits (UNVERIFIED this pass) |
| Neon Free / Launch | Free: no card (UNVERIFIED) | Free has hard limits (for example 1 GB per project). Launch has spending **notifications** only; no spending limit is listed |
| Deno Deploy | Free plan has fixed quotas | UNVERIFIED whether Free stops or is billed past quota |
| Google Cloud Run | Billing account required | Spend-cap budgets exist for Cloud Run and Cloud Run functions, scoped to one project and one service. Alerts-only budgets are also available |
| OpenAI | Prepaid credits; usage tier is set by credit purchases | Organization or project spend limits, plus an approved monthly usage limit |
| Anthropic | Tier-based | Hard monthly spend cap per tier. Requests return 429 until the 1st of the next month. A lower limit can be self-set |
| Mistral / Groq | UNVERIFIED; Groq rate limits are per organization | UNVERIFIED |

Sources: developers.cloudflare.com/r2/pricing; neon.com/docs/introduction/plans; cloud.google.com/billing/docs/how-to/budgets; cloud.google.com/billing/docs/how-to/budgets-spend-caps; platform.openai.com/docs/guides/rate-limits; docs.anthropic.com/en/api/rate-limits; console.groq.com/docs/rate-limits.

## Q5 Runtime

| Item | Deno Deploy (new) | Google Cloud Run |
|---|---|---|
| Free limits | 1M requests, 20 GiB egress, 10 h active CPU, 10 GiB revision storage, 1 GiB KV, 5 custom domains per month | 240k vCPU-seconds and 450k GiB-seconds per month, aggregated per billing account, applied as a discount using Tier 1 pricing; 1 GiB of North America egress |
| EU region | `--region us \| eu \| global` per app. Log and telemetry storage location UNVERIFIED | europe-west1 (Belgium) is listed under Tier 1. europe-west3 tier UNVERIFIED (it was not in the extracted Tier 1 list) [INFERENCE: likely Tier 2, so the free tier would apply only as a dollar-equivalent discount] |
| Node / npm | "Full support" for running Node apps; Deploy Classic was limited and was shut down on 2026-07-20 | Any container |
| Cold starts | Idle apps are evicted; latency figures UNVERIFIED | min-instances can be set; latency figures UNVERIFIED |
| DPA | UNVERIFIED | Google Cloud Data Processing Addendum (standard; not fetched in this pass) |

Sources: deno.com/deploy/pricing; docs.deno.com/runtime/reference/cli/deploy.md; docs.deno.com/deploy; cloud.google.com/run/pricing; cloud.google.com/run/docs/locations.

## Q6 IaC

| Target | Provider | Status |
|---|---|---|
| Cloudflare (R2, Pages, DNS) | `cloudflare/cloudflare` | Official, published by Cloudflare, 178 versions |
| Neon | `kislerdm/neon` | Community-built; Neon sponsors it and links to it from its docs. A `neondatabase/terraform-provider-neon` repository also exists |
| Deno Deploy | `denoland/deno` | Official, but v0.1.0 and labelled "hosted Deno APIs". Coverage of new Deploy is UNVERIFIED |
| Sentry | `jianyuan/sentry` v0.15.8 | Community, maintained |
| State in R2 | S3-compatible backend | Documented by Cloudflare ("Remote R2 backend"). Free within the R2 free tier [INFERENCE] |

Sources: registry.terraform.io (cloudflare/cloudflare, denoland/deno, jianyuan/sentry); neon.com/docs/reference/terraform; developers.cloudflare.com/terraform/advanced-topics/remote-backend.

## Q7 Secrets (GitHub Free, private repo)

| Feature | Available? |
|---|---|
| Environment secrets | No. On Free they work in public repos only; private repos need Pro, Team or Enterprise |
| Required reviewers / wait timers | No; public repos only on Free, Pro and Team |
| Deployment branch rules | No on Free; Pro and Team get them for private repos |
| Environment variables | Pro and Team only for private repos |
| Repository-level Actions secrets | Yes [INFERENCE: standard on all plans; not re-fetched in this pass] |

Is a secrets manager needed? [INFERENCE] No. Repository secrets, optionally with environment-prefixed names, cover a solo setup. Infisical and Doppler free tiers were not researched in this pass (UNVERIFIED).

Source: docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments.

## Sources (accessed 2026-10-28)

- https://neon.com/docs/auth/production-checklist
- https://neon.com/docs/auth/guides/customize-emails
- https://resend.com/pricing
- https://resend.com/docs/dashboard/domains/regions
- https://postmarkapp.com/pricing
- https://www.brevo.com/pricing/
- https://aws.amazon.com/ses/pricing/
- https://www.scaleway.com/en/transactional-email-tem/
- https://www.mailjet.com/pricing/
- https://sentry.io/pricing
- https://docs.sentry.io/pricing/
- https://docs.sentry.io/organization/data-storage-location/
- https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/
- https://glitchtip.com/pricing
- https://betterstack.com/pricing
- https://uptimerobot.com/pricing.md
- https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan
- https://www.checklyhq.com/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/
- https://neon.com/docs/introduction/plans
- https://cloud.google.com/run/pricing
- https://cloud.google.com/run/docs/locations
- https://cloud.google.com/billing/docs/how-to/budgets
- https://cloud.google.com/billing/docs/how-to/budgets-spend-caps
- https://platform.openai.com/docs/guides/rate-limits
- https://docs.anthropic.com/en/api/rate-limits
- https://console.groq.com/docs/rate-limits
- https://deno.com/deploy/pricing
- https://docs.deno.com/deploy
- https://docs.deno.com/runtime/reference/cli/deploy.md
- https://registry.terraform.io/providers/cloudflare/cloudflare/latest
- https://registry.terraform.io/providers/denoland/deno/latest/docs
- https://registry.terraform.io/providers/jianyuan/sentry/latest
- https://neon.com/docs/reference/terraform
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
