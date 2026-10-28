# Free-tier backend platforms: limits, EU region, backups, first paid threshold

Ticket: `.scratch/mvp-plan/issues/06-backend-platform-free-tiers.md`. All sources read 2026-10-28. Prices are USD as published.

## Answer

- **Only Supabase and Appwrite Cloud give DB + auth + file storage in one free product.** Both pause free projects after **1 week of inactivity**, include **no backups** on free, and have a **$25/month** first paid plan (Pro). Supabase is Postgres with RLS, has EU regions (Frankfurt, Ireland, Paris, Stockholm and others), and its DPA is part of the standard terms. Appwrite is not Postgres: it uses per-row/per-file permissions. Appwrite has one EU region (Frankfurt), and you download/sign its DPA in the console.
- **Neon** (now "from Databricks") is the most generous free Postgres option: 100 projects, 1 GB per project, 100 CU-h per project per month, 60k MAU of managed Better Auth, and 5 GB of object storage. It has no inactivity pause (it scales to zero after 5 min), offers a 6-hour restore window on free, and has EU regions in Frankfurt and London. Its first paid plan, **Launch**, is pay-as-you-go with **no monthly minimum**.
- **Firebase Spark** has no Postgres (it uses Firestore NoSQL with Security Rules). It gives 1 GiB of storage, 50K reads and 20K writes per day, and 50K MAU. **Cloud Storage, Functions and Firestore backups all need the Blaze plan.** Blaze is pay-as-you-go with no fixed fee, and in practice a file-upload feature forces you onto it.
- **Turso** and **Cloudflare D1** are SQLite databases only, with no auth and no file storage included.
  - Turso: free plan archives databases after 10 days of inactivity and includes 1-day PITR. First paid plan is $5.99/month ($4.99/month billed yearly). Turso has announced it is joining Supabase.
  - D1: 500 MB per database, 5 GB per account, 7-day Time Travel on free, and an `eu` jurisdiction setting. First paid plan is Workers Paid at a $5/month minimum.
- **PocketBase** is self-hosted only (one SQLite binary, MIT licence) and runs on a single server, so it only scales vertically. Free hosts are limited:
  - GCP's free e2-micro runs only in US regions.
  - Oracle Always Free runs in your home region (which can be in the EU), but Oracle may reclaim idle instances.
  - Fly.io's free trial lasts 7 days or 2 VM-hours.
  - In practice, the first cost is a small VPS (Hetzner price not verified).
- **For health data under GDPR, it matters most that** only the paid tiers include automatic backups (Supabase, Appwrite) or longer retention (Neon, Turso). The free-tier alternatives are manual `pg_dump` or exports.

## Comparison table

| | Supabase | Neon (+ Neon Auth) | Firebase (Spark) | Appwrite Cloud | Turso | Cloudflare D1 | PocketBase (self-host) |
|---|---|---|---|---|---|---|---|
| DB engine / Postgres | Postgres (dedicated per project) [S1] | Postgres [N1] | Firestore NoSQL; Postgres only via SQL Connect/Cloud SQL (3-month trial, then Blaze) [F1] | Serverless "TablesDB"; Postgres only as a paid Dedicated database [A1] | SQLite-compatible (libSQL) with some pragma limits [T3] | SQLite [D1] | Embedded SQLite (WAL); no other DBs [P1] |
| Free DB size | 500 MB per project, 2 active projects [S1] | 1 GB per project, 20 GB account total, 100 projects [N1] | 1 GiB Firestore [F1] | 2 GB storage (org total), 1 DB per project, 2 projects [A1][A2] | 5 GB, 100 DBs [T1] | 500 MB per DB, 5 GB per account, 10 DBs [D2] | Limited by host disk |
| Free compute / ops | Shared CPU, 500 MB RAM; unlimited API requests [S1] | 100 CU-hours per project per month, up to 2 CU [N1] | 50K reads/day, 20K writes/day, 20K deletes/day [F1] | 500K reads/month, 250K writes/month, 750K function executions [A1] | 500M rows read and 10M rows written per month [T1] | 5M rows read and 100K rows written per day [D1] | Limited by host |
| Free auth MAU | 50,000 [S1] | 60k per project (Managed Better Auth) [N1][N4] | 50K (Identity Platform) [F1] | 75K [A1] | None (bring your own JWKS auth) [T4] | None (build it on Workers) | Built in; unlimited (self-hosted) [P1] |
| Free file storage | 1 GB [S1] | 5 GB object storage per project [N1] | **Not available on Spark** (Cloud Storage needs Blaze) [F1] | Included in 2 GB; 50 MB per-file limit [A1] | None | None (R2 is a separate product) | Local disk or S3 [P2] |
| Free egress / bandwidth | 5 GB + 5 GB cached [S1] | 5 GB per project [N1] | Firestore 10 GiB/month [F1] | 5 GB/month [A1] | 3 GB syncs [T1] | No egress charges [D1] | Limited by host |
| Inactivity rules | **Paused after 1 week of inactivity** [S1] | Scale-to-zero after 5 min, cannot be disabled; no pause. Free projects in deprecated Azure regions that are inactive ≥90 days face deletion [N1][N3] | None stated | **Paused after 1 week of inactivity** [A1] | **Archived after 10 days of inactivity** [T5] | None stated | Oracle may reclaim Always Free VMs that are idle (<20% usage over 7 days) [P4] |
| What happens at a free limit | (overage not available on free) | Compute suspended (CU-h or egress); writes blocked (storage); data kept [N1] | Daily limits reset at midnight [F1] | Project freezes; console read-only [A1][A2] | Databases blocked [T1] | Queries error until the daily reset; storage full blocks writes [D1] | n/a |
| Commercial use on free | No prohibition found in terms read [S6] (unverified) | Free plan "permanent", for "Prototypes, side projects, and small teams" [N1]; no explicit ban found (unverified) | No ban found on pricing page (unverified) | Marketed for "passion projects and small applications" [A1]; no explicit ban found (unverified) | Unverified | Unverified | MIT licence; no restriction [P3] |
| EU region | Frankfurt, Ireland, Paris, Stockholm, Zurich, London. The "Europe" general region may land in London/Zurich (non-EU) [S4] | AWS Frankfurt, London [N3] | Firestore `eur3` multi-region (Belgium + Netherlands) plus many europe-* regions; **location cannot be changed after creation** [F3] | Frankfurt; Amsterdam and London "coming soon" [A3] | Locations listed by `turso db locations` (not enumerated here; unverified) [T6] | `eu` jurisdiction, set only at creation [D3] | Your host's region (GCP free tier is US-only [P1]; OCI uses your home region [P4]) |
| Multi-region path | Paid read replicas [S2] | Read replicas on all plans (count as CU-h) [N1] | Multi-region locations available [F3] | Independent regions; no cross-region replication stated [A3] | Durability via S3; replicas (details unverified) [T7] | Read replication with no extra replica charge [D1] | Single server only; vertical scaling [P1] |
| Backups / PITR on free | **None**; docs recommend `supabase db dump` [S2] | 6-hour history window (1 GB limit), 1 manual snapshot [N1] | Firestore backups need Blaze [F2] | **None** [A1][A4] | PITR to the last 24 h [T2] | Time Travel 7 days [D2] | DIY: built-in backup API, copy `pb_data`, Litestream [P1][P2] |
| Backups / PITR on paid | Pro: daily backups kept 7 days. PITR $100/month per 7 days (needs Small compute or larger) [S1][S2] | Launch: up to 7 days, $0.20/GB-month. Scale: up to 30 days [N1] | Billed per backup storage and restore [F2] | Pro: daily backups kept 7 days. Dedicated DB PITR +20% of base [A1][A4] | Developer 10 d, Scaler 30 d, Pro 90 d [T2] | Workers Paid: 30 days [D2] | n/a |
| Access control | Postgres RLS | Postgres RLS. Data API requires RLS on every table, using `auth.user_id()` [N5] | Firebase Security Rules [F4] | Per-resource permissions on rows and files for users, teams and roles [A5] | Token-scoped table/action permissions, grant-only (not row-level) [T4] | None built in (enforced in Worker code) | Per-collection API rules (list/view/create/update/delete) using filter expressions [P2] |
| GDPR DPA | DPA with SCCs (2021/914). Accepting the Agreement counts as signing the SCCs [S5] | Databricks DPA via the Neon platform schedule [N6] | Firebase Data Processing and Security Terms, with SCCs [F5] | Downloaded/signed in Org Settings → "Download DPA document" [A6] | Listed as a pricing feature row; which plans include it was **not verified** [T1] | Customer DPA "forms part of the Main Agreement" [D4] | You are the operator; a DPA comes from your VPS host |
| Lock-in | Low for the DB (standard Postgres plus `pg_dump`). Auth schema and Storage API are Supabase-specific | Low (standard Postgres). Auth is open-source Better Auth stored in the `neon_auth` schema [N4] | High (Firestore data model, Rules, SDKs) | Medium–high (Appwrite APIs; self-hostable OSS) | Low–medium (SQLite file format; libSQL client) | Medium (Workers binding; SQLite export) | Low (single binary, SQLite file) but it is a one-person project with "no promises for maintenance" [P1] |
| **First paid threshold** | Any of: >500 MB DB, >5 GB egress, >1 GB files, >50k MAU, or wanting no pause or backups → **Pro $25/month** (includes $10 compute credit = one Micro project). PITR adds $100/month plus Small compute (+$5 over Micro) [S1][S2] | Any of: >1 GB per project, >100 CU-h, >5 GB egress, or wanting a longer restore window → **Launch, pay-as-you-go, no minimum**: $0.106/CU-h, $0.35/GB-month storage [N1] | Needing Cloud Storage, Functions, backups, or more than the daily Firestore quota → **Blaze, pay-as-you-go, no fixed fee**; Spark quotas still included [F1] | Any of: >2 GB, >5 GB bandwidth, >75K MAU, >500K reads/month, or wanting no pause or backups → **Pro $25/month** [A1] | Any of: >5 GB, >500M reads, >10M writes, or wanting no archiving → **Developer $5.99/month** ($4.99 billed yearly) [T1] | Any of: >500 MB per DB, >5 GB total, >5M reads/day, >100K writes/day → **Workers Paid $5/month minimum** [D1][W1] | Leaving the free VM. PocketBase FAQ cites a "$4 Hetzner CAX11 VPS" (2 vCPU, 4 GB) [P1]; Hetzner's current price not verified |

## Trade-offs the facts imply (no decision made)

- **The 1-week pause is a problem with no real users.** On Supabase and Appwrite free, a pre-launch app with no traffic gets paused. Neon's scale-to-zero does not pause, but it adds cold-start latency (behaviour inferred from the docs, not measured).
- **Backups.** Supabase free has no backups, and neither does Appwrite free. The only free-tier restore windows are Neon (6 h), Turso (24 h) and D1 (7 days).
- **Postgres + RLS + EU + DPA available on free:** Supabase and Neon. Neon needs separate file storage only if Stamina outgrows the bundled 5 GB of object storage.
- **Firebase.** Any feature that stores user photos or files needs Blaze from day one. Firestore location is fixed permanently when the database is created.
- **Turso and D1** cover only the database. Auth and file storage would need other products, which means more processors under GDPR.
- **Vendor changes.** Turso has announced it is joining Supabase [T1], and Neon is now under Databricks [N1]. Watch for changes to their terms.

## Sources (all accessed 2026-10-28)

- [S1] Supabase Pricing — https://supabase.com/pricing (markdown alternate `pricing.md`)
- [S2] Supabase Database Backups — https://supabase.com/docs/guides/platform/backups
- [S3] Supabase About billing — https://supabase.com/docs/guides/platform/billing-on-supabase
- [S4] Supabase Regions — https://supabase.com/docs/guides/platform/regions
- [S5] Supabase DPA — https://supabase.com/legal/dpa (redirects to /legal/customer-resources/data-processing-addendum)
- [S6] Supabase Terms — https://supabase.com/terms
- [N1] Neon Pricing — https://neon.com/pricing ; Plans — https://neon.com/docs/introduction/plans
- [N3] Neon Regions — https://neon.com/docs/introduction/regions
- [N4] Neon Managed Better Auth — https://neon.com/docs/auth/overview
- [N5] Neon RLS — https://neon.com/docs/guides/row-level-security
- [N6] Neon Platform Terms (Databricks schedule/DPA) — https://neon.com/platform-terms
- [F1] Firebase Pricing — https://firebase.google.com/pricing
- [F2] Firestore backups — https://firebase.google.com/docs/firestore/backups
- [F3] Firestore locations — https://firebase.google.com/docs/firestore/locations
- [F4] Firebase Security Rules — https://firebase.google.com/docs/rules
- [F5] Firebase Data Processing and Security Terms — https://firebase.google.com/terms/data-processing-terms
- [A1] Appwrite Pricing (rendered plan comparison) — https://appwrite.io/pricing
- [A2] Appwrite Free plan — https://appwrite.io/docs/advanced/billing/free ; Pro — https://appwrite.io/docs/advanced/billing/pro
- [A3] Appwrite Regions — https://appwrite.io/docs/products/network/regions
- [A4] Appwrite Backups — https://appwrite.io/docs/products/databases/tablesdb/backups
- [A5] Appwrite Permissions — https://appwrite.io/docs/advanced/security/permissions
- [A6] Appwrite GDPR / DPA — https://appwrite.io/docs/advanced/security/gdpr
- [T1] Turso Pricing (monthly and yearly toggle, FAQ) — https://turso.tech/pricing
- [T2] Turso PITR — https://docs.turso.tech/features/point-in-time-recovery
- [T3] Turso Limitations — https://docs.turso.tech/cloud/limitations
- [T4] Turso Fine-Grained Permissions — https://docs.turso.tech/sdk/authorization/fine-grained-permissions
- [T5] Turso Unarchive Group (10-day archiving) — https://docs.turso.tech/api-reference/groups/unarchive
- [T6] Turso `db locations` — https://docs.turso.tech/cli/db/locations
- [T7] Turso Durability — https://docs.turso.tech/cloud/durability
- [D1] Cloudflare D1 Pricing — https://developers.cloudflare.com/d1/platform/pricing/
- [D2] Cloudflare D1 Limits — https://developers.cloudflare.com/d1/platform/limits/
- [D3] Cloudflare D1 Data location — https://developers.cloudflare.com/d1/configuration/data-location/
- [D4] Cloudflare Customer DPA — https://www.cloudflare.com/cloudflare-customer-dpa/
- [W1] Cloudflare Workers Pricing — https://developers.cloudflare.com/workers/platform/pricing/
- [P1] PocketBase FAQ — https://pocketbase.io/faq/
- [P2] PocketBase Going to production — https://pocketbase.io/docs/going-to-production/ ; API rules — https://pocketbase.io/docs/api-rules-and-filters/
- [P3] PocketBase LICENSE (MIT) — https://github.com/pocketbase/pocketbase/blob/master/LICENSE.md
- [P4] Oracle Cloud Always Free Resources — https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- [P5] Fly.io Free Trial — https://fly.io/docs/about/free-trial/

## Unverified

- Explicit commercial-use permission on each free tier. No prohibition was found, but full terms were not read for Neon, Firebase, Appwrite, Turso or Cloudflare.
- Which Turso plan includes the DPA (the cell is an icon on the pricing page). Turso's terms and DPA URLs returned 404.
- Turso's EU location list. Current Hetzner VPS price.
