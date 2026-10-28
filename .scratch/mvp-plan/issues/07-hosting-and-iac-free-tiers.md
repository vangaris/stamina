# Free-tier hosting and IaC: commercial terms, multi-region path

Type: research
Status: resolved

## Question

Compare Cloudflare (Pages, Workers), Vercel (Hobby), Netlify, Fly.io, Render, Deno Deploy and Google Cloud Run for hosting a Vue PWA plus a TypeScript API/worker layer. For each: free-tier limits, whether commercial use is allowed on free (Vercel Hobby is known to forbid it; verify), cold starts, EU region pinning, edge/multi-region story, preview deployments per PR, GitHub Actions integration, and first paid threshold + price. Also: which IaC tool can manage the chosen stack at €0 (OpenTofu/Terraform providers, Pulumi free tier, SST, wrangler config) and how state is stored free. Cite official docs and pricing pages.

## Answer

Vercel Hobby bans commercial use; Fly has no free tier; Render Free sleeps. €0 + commercial + always-warm = Cloudflare Workers/Pages (10 ms CPU, no EU pinning); EU-pinnable alternatives Cloud Run / Deno Deploy. IaC: OpenTofu with state in R2.

Full findings: `docs/research/hosting-and-iac-free-tiers.md` on branch `research/hosting-and-iac-free-tiers` (commit `21c1bde`).

- **Vercel Hobby forbids commercial use. Verified** in the Hobby docs, fair-use guidelines and Terms: "personal or non-commercial use". The first plan that allows commercial use is Pro at **$20/mo**.
- **Fly.io has no free tier** for new organisations, only a trial of 2 h of Machine runtime or 7 days. The cheapest always-on Machine costs about **$2.19/mo** (256 MB, US regions).
- **Render Free**: services spin down after 15 min idle and take about 1 min to spin back up. 750 instance-hours per month. Render itself says "Do not use them for production applications". The first paid instance is **$7/mo**.
- **Netlify Free**: 300 credits per month with a hard cap. Function region selection needs **Pro ($20/mo)**, so on Free, functions run in the default US East (Ohio). Personal plan is $9/mo. I found no non-commercial clause.
- **Cloudflare Workers/Pages Free**: 100k requests/day, **10 ms CPU** per request, 500 Pages builds/month, isolates with no VM cold start, per-PR preview URLs, and an official GitHub Action. No EU pinning on self-serve plans: the Data Localization Suite is Enterprise-only. Placement hints can move execution near a database. The first paid tier is **Workers Paid at $5/mo**. I found no non-commercial clause.
- **Deno Deploy Free**: 1M requests/month, 20 GiB egress, 10 h active CPU. Regions are `us`/`eu` (or `global`). Pro is **$20/mo**.
- **Google Cloud Run**: free tier of 180k vCPU-s, 360k GiB-s and 2M requests per month. You can pin the service to EU regions. It scales to zero, so cold starts happen unless you pay for min-instances. Uses an official `deploy-cloudrun` action. Billing is usage-based and needs a GCP billing account.
- **IaC at €0**: OpenTofu/Terraform have partner providers for Cloudflare, Vercel, Netlify (v0.x) and Render, plus the official Google provider. The Fly provider is stale (last release 2023) and the Deno one is community-maintained v0.1.0. State can be stored free in an S3-compatible backend on **Cloudflare R2** (10 GB free), in GCS, in HCP Terraform Free (≤500 managed resources), or in Pulumi Cloud Free (1 user). Alternatively, `wrangler.jsonc` can be the config for a Cloudflare-only stack. SST supports only `aws` or `cloudflare` as the "home" where it stores state.
- **Trade-off**: the only options here that are €0, allowed for commercial use and always warm are Cloudflare (with the 10 ms CPU cap) and Deno Deploy/Cloud Run (EU-pinnable; Cloud Run has cold starts). True multi-region compute costs money on Vercel (Pro: 5 regions), Netlify (Pro) and Fly.
