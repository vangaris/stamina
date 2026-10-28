# Free-tier backend platforms: limits, EU region, backups, first paid threshold

Type: research
Status: resolved

## Question

Compare Supabase, Neon (+ separate auth), Firebase, Appwrite Cloud, Turso, Cloudflare D1, and PocketBase-on-free-host as the database + auth + storage platform for Stamina. For each: free-tier limits (DB size, MAU for auth, bandwidth, compute, pausing/inactivity rules), commercial use allowed on free tier, EU region availability and multi-region path, backups/PITR on free vs paid, row-level security / access control model, GDPR DPA availability, Postgres compatibility, lock-in, and the **first paid threshold** (the exact limit that forces upgrade and the price of the first paid plan). Cite official pricing and docs pages, with the date read.

## Answer

Only Supabase and Appwrite bundle DB + auth + storage free; both pause after 1 idle week, have no free backups, first paid $25/mo. Neon: most generous free Postgres (EU, 6 h PITR, pay-as-you-go upgrade).

Full findings: `docs/research/backend-platform-free-tiers.md` on branch `research/backend-platform-free-tiers` (commit `4877609`).

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
