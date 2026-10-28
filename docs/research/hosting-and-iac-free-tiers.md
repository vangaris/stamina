# Free-tier hosting and IaC: commercial terms, multi-region path

Ticket: `.scratch/mvp-plan/issues/07-hosting-and-iac-free-tiers.md`. All sources accessed 2026-10-28. "Not found" means the cited official page contains no such clause; that is not proof the clause is absent everywhere.

## Answer

- **Vercel Hobby forbids commercial use. Verified** in the Hobby docs, fair-use guidelines and Terms: "personal or non-commercial use". The first plan that allows commercial use is Pro at **$20/mo**.
- **Fly.io has no free tier** for new organisations, only a trial of 2 h of Machine runtime or 7 days. The cheapest always-on Machine costs about **$2.19/mo** (256 MB, US regions).
- **Render Free**: services spin down after 15 min idle and take about 1 min to spin back up. 750 instance-hours per month. Render itself says "Do not use them for production applications". The first paid instance is **$7/mo**.
- **Netlify Free**: 300 credits per month with a hard cap. Function region selection needs **Pro ($20/mo)**, so on Free, functions run in the default US East (Ohio). Personal plan is $9/mo. I found no non-commercial clause.
- **Cloudflare Workers/Pages Free**: 100k requests/day, **10 ms CPU** per request, 500 Pages builds/month, isolates with no VM cold start, per-PR preview URLs, and an official GitHub Action. No EU pinning on self-serve plans: the Data Localization Suite is Enterprise-only. Placement hints can move execution near a database. The first paid tier is **Workers Paid at $5/mo**. I found no non-commercial clause.
- **Deno Deploy Free**: 1M requests/month, 20 GiB egress, 10 h active CPU. Regions are `us`/`eu` (or `global`). Pro is **$20/mo**.
- **Google Cloud Run**: free tier of 180k vCPU-s, 360k GiB-s and 2M requests per month. You can pin the service to EU regions. It scales to zero, so cold starts happen unless you pay for min-instances. Uses an official `deploy-cloudrun` action. Billing is usage-based and needs a GCP billing account.
- **IaC at €0**: OpenTofu/Terraform have partner providers for Cloudflare, Vercel, Netlify (v0.x) and Render, plus the official Google provider. The Fly provider is stale (last release 2023) and the Deno one is community-maintained v0.1.0. State can be stored free in an S3-compatible backend on **Cloudflare R2** (10 GB free), in GCS, in HCP Terraform Free (≤500 managed resources), or in Pulumi Cloud Free (1 user). Alternatively, `wrangler.jsonc` can be the config for a Cloudflare-only stack. SST supports only `aws` or `cloudflare` as the "home" where it stores state.
- **Trade-off**: the only options here that are €0, allowed for commercial use and always warm are Cloudflare (with the 10 ms CPU cap) and Deno Deploy/Cloud Run (EU-pinnable; Cloud Run has cold starts). True multi-region compute costs money on Vercel (Pro: 5 regions), Netlify (Pro) and Fly.

## Evidence: hosting

| Platform | Free-tier limits | Commercial on free | Cold starts | EU pinning | Edge / multi-region | Per-PR previews | GitHub Actions | First paid |
|---|---|---|---|---|---|---|---|---|
| Cloudflare Workers + Pages | Workers: 100,000 req/day, 10 ms CPU/req, 128 MB, 100 Workers, 5 cron triggers [1]. Pages: 500 builds/mo, 1 concurrent build, 20,000 files, 25 MiB/file [2]. R2: 10 GB-month, 1M Class A, 10M Class B, free egress [3] | No non-commercial clause found in the website terms [4] (self-serve subscription terms not checked: **unverified**) | V8 isolates "eliminate the cold starts of the virtual machine model" [5]; startup limit 1 s [1] | No self-serve data pinning. The Data Localization Suite is an "Enterprise-only paid add-on" [6]. Placement hints (`region: "gcp:…"/"aws:…"`, host probe) choose where a Worker runs relative to the backend [7] | Global by default; smart/explicit placement [7] | Pages: unique preview URL per PR (same-repo PRs only) [8]. Workers: "Version URLs" for uploaded versions [9] | Official `cloudflare/wrangler-action@v4` [10] | Workers Paid **$5/mo** minimum, 10M requests, 30M CPU-ms included [11] |
| Vercel Hobby | 1M function invocations, 4 active CPU-hrs, 360 GB-hrs memory, 100 GB fast data transfer, 1M CDN requests [12] | **No.** "restricted to non-commercial personal use only. All commercial usage … requires either a Pro or Enterprise plan" [13]; Terms: "personal or non-commercial use" [14] | Serverless functions; no cold-start figure checked (**unverified**) | Hobby: function regions = **single region** (configurable) [15] | Pro: 5 function regions; Enterprise: all [15] | Preview Deployment URLs via Vercel for GitHub [16] | Git integration [16]; GitHub Actions + CLI possible (**not checked**) | Pro **$20/mo** [17] |
| Netlify Free | 300 credits/mo, hard limit [18][19]. Costs: deploy 15 cr, compute 10 cr/GB-h, bandwidth 20 cr/GB, 2 cr per 10k requests [18] | No non-commercial clause found in pricing or the self-serve subscription agreement [20] | **Unverified** | Function region is configurable **only on Pro/Enterprise**; default `cmh` (US East, Ohio) [21] | Global CDN for static assets [18] | "Unlimited deploy previews" [18] | Git CD + Netlify CLI/API [22] | Personal **$9/mo** (1,000 credits); Pro $20/mo [18] |
| Fly.io | **None**: "New organizations don't have a free tier"; trial of 2 h Machine runtime or 7 days [23] | n/a | With autostop, a cold start "takes about 2 seconds or more"; suspend resumes in "a few hundred milliseconds" [24] | EU regions incl. ams, arn, cdg, fra [25] | Multi-region Machines on Anycast [25] | Via the `fly-pr-review-apps` GitHub Action [26] | Documented GitHub Actions CD [27] | Pay as you go: shared-cpu-1x 256 MB **$2.19/mo**; egress $0.02/GB in NA/EU [23] |
| Render Free | 750 free instance-hours/mo per workspace; free Postgres expires after 30 days [28]. Hobby workspace: 5 GB bandwidth, up to 25 services [29] | No clause found, but Render states free instances are not for production [28] | Spins down after 15 min idle; spin-up "takes about one minute" [28] | Frankfurt region available [30] | Single region per service [30] | PR previews (Hobby: "single-service previews"); previews billed like the base service, free if the base is a free static site [29][31] | Git autodeploy; deploy hooks and an Actions example [31][32] | Instance **$7/mo** (512 MB); Pro workspace $25/mo + compute [29] |
| Deno Deploy Free | 1M requests/mo, 20 GiB egress, 10 h active CPU, 5 custom domains, KV 1 GiB [33] | Plan is "For personal use and smaller projects" [33]; no explicit non-commercial clause found (terms URL returned 404: **unverified**) | **Unverified** | Regions `us`, `eu`, `global` (`deno deploy --region`) [34][35] | 2 regions (Classic had 6 and shut down on 2026-07-20) [35][36] | "Preview" timeline per revision [37]; per-PR behaviour **unverified** | Built-in GitHub builds [37] | Pro **$20/mo** (5M requests, then $2/M; 200 GiB, then $0.20/GiB) [33] |
| Google Cloud Run | 180,000 vCPU-s, 360,000 GiB-s, 2M requests/mo (based on us-central1 pricing); 1 GiB free egress within North America [38] | GCP Free Tier: no non-commercial clause found; needs a billing account (Free Trial gives a $300 / 90-day credit) [39] | Scale to zero → cold starts; avoided with paid `min-instances` [40]; pending requests wait for startup [41] | EU regions e.g. europe-west1 (Belgium), europe-west4 (Netherlands), europe-west10 (Berlin) [42] | Multi-region needs one service per region (+ load balancer, **not checked**) | Revision tags (**not checked**) | Official `google-github-actions/deploy-cloudrun@v3` [43] | Pay per use above free tier [38] |

## Evidence: IaC and free state

| Tool | Coverage of this stack | State storage at €0 | Notes |
|---|---|---|---|
| OpenTofu / Terraform providers | `cloudflare/cloudflare` 5.28.1 (partner), `vercel/vercel` 5.24.1 (partner), `netlify/netlify` 0.4.4 (partner), `render-oss/render` 1.9.1 (partner), `hashicorp/google` 8.9.0 (official), `fly-apps/fly` 0.0.23 (last published 2023-06-22), `denoland/deno` 0.1.0 (community, 2023) [44] | S3 backend with a custom endpoint → **Cloudflare R2** (Cloudflare documents this) [45], 10 GB free [3]; OpenTofu S3 locking via `use_lockfile` (conditional writes) [46]; GCS backend [47]; OpenTofu has native state encryption [48] | Registry data is from the Terraform registry API; OpenTofu registry parity was **not checked** |
| HCP Terraform Free | Any Terraform provider | Free plan "No charge for up to 500 managed resources" [49] | |
| Pulumi | Uses Pulumi/Terraform-bridged providers | Pulumi Cloud Free: $0, 1 user, IaC state management, 500 workflow minutes [50]. DIY backends: S3/S3-compatible, GCS, Postgres, local [51] | Essentials is $40/mo [50] |
| SST | AWS and Cloudflare components; can also use the 150+ Pulumi/Terraform providers [52] | State goes to the `home` bucket; `home` can only be `aws` or `cloudflare` [53] | |
| Wrangler config | Workers/Pages only (bindings, placement, etc.) [54] | No state file: the config file is the declarative source | Does not cover DNS/zone or non-Cloudflare resources |

## Sources (accessed 2026-10-28)

1. https://developers.cloudflare.com/workers/platform/limits/
2. https://developers.cloudflare.com/pages/platform/limits/
3. https://developers.cloudflare.com/r2/pricing/
4. https://www.cloudflare.com/website-terms/
5. https://developers.cloudflare.com/workers/reference/how-workers-works/
6. https://developers.cloudflare.com/data-localization/
7. https://developers.cloudflare.com/workers/configuration/smart-placement/
8. https://developers.cloudflare.com/pages/configuration/preview-deployments/
9. https://developers.cloudflare.com/workers/configuration/previews/
10. https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
11. https://developers.cloudflare.com/workers/platform/pricing/
12. https://vercel.com/docs/plans/hobby
13. https://vercel.com/docs/limits/fair-use-guidelines
14. https://vercel.com/legal/terms
15. https://vercel.com/docs/functions/configuring-functions/region
16. https://vercel.com/docs/git/vercel-for-github
17. https://vercel.com/pricing
18. https://www.netlify.com/pricing/
19. https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
20. https://www.netlify.com/legal/self-serve-subscription-agreement/
21. https://docs.netlify.com/build/functions/optional-configuration/
22. https://docs.netlify.com/deploy/create-deploys/
23. https://fly.io/docs/about/pricing/
24. https://fly.io/docs/launch/autostop-autostart/
25. https://fly.io/docs/reference/regions/
26. https://fly.io/docs/blueprints/review-apps-guide/
27. https://fly.io/docs/launch/continuous-deployment-with-github-actions/
28. https://render.com/docs/free
29. https://render.com/pricing
30. https://render.com/docs/regions
31. https://render.com/docs/service-previews
32. https://render.com/docs/deploy-hooks
33. https://deno.com/deploy/pricing
34. https://docs.deno.com/runtime/reference/cli/deploy
35. https://docs.deno.com/deploy/migration_guide
36. https://docs.deno.com/deploy/
37. https://docs.deno.com/deploy/reference/builds/
38. https://cloud.google.com/run/pricing
39. https://cloud.google.com/free/docs/free-cloud-features
40. https://cloud.google.com/run/docs/configuring/min-instances
41. https://cloud.google.com/run/docs/tips/general
42. https://cloud.google.com/run/docs/locations
43. https://github.com/google-github-actions/deploy-cloudrun
44. https://registry.terraform.io/v1/providers/{cloudflare/cloudflare, vercel/vercel, netlify/netlify, render-oss/render, hashicorp/google, fly-apps/fly, denoland/deno}
45. https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/
46. https://opentofu.org/docs/language/settings/backends/s3/
47. https://opentofu.org/docs/language/settings/backends/gcs/
48. https://opentofu.org/docs/language/state/encryption/
49. https://developer.hashicorp.com/terraform/cloud-docs/overview
50. https://www.pulumi.com/pricing/
51. https://www.pulumi.com/docs/iac/concepts/state-and-backends/
52. https://sst.dev/docs/
53. https://sst.dev/docs/state/
54. https://developers.cloudflare.com/workers/wrangler/configuration/
