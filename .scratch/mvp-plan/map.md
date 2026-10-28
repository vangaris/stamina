# Stamina MVP plan

Labels: wayfinder:map

## Destination

`docs/mvp-plan.md`: a decision-complete MVP plan (10 role sections, 8-week roadmap, tech-stack table, top 5 risks, decisions marked [Vang] / [External]) with nothing left to decide before Week 1 of the build. Building the MVP is beyond this map: hand off to `/to-spec` → `/to-tickets` → `/implement`.

## Notes

- **Domain**: a coaching product that generates and adapts a Program across four Pillars (Training, Nutrition, Mobility & Recovery, Daily Routine) from goals, sport, equipment, schedule, Check-ins and Logs. Use the vocabulary in `GLOSSARY.md`.
- **Skills**: grilling tickets call `grilling` + `domain-modeling`; research tickets `research`; prototype tickets `prototype`.
- **Hard constraints on every decision**: live with real users in ≤ 8 weeks; Vang part-time (~15 h/week) + AI coding agents; €0 / free tiers until traction, and every service names its first paid threshold; scales to worldwide users without a rewrite (multi-region, i18n, metric/imperial, time zones); not a medical device (screening, disclaimers, red-flag rules, GDPR for health data); prefer Vue 3 + TypeScript unless there's a strong reason not to.
- **Standing preferences**: MVP sport scope is padel + general strength; launch locales EN + EL with metric and imperial units; safety rules and nutrition logic are reviewed by a licensed professional before real users; decisions in the final document are marked [Vang] (made by Vang during grilling) or [External] (needs a third party, with needed-by week).
- **Execution override**: the final ticket, Write docs/mvp-plan.md, produces the deliverable document inside this map. Everything else produces decisions, not deliverables.
- **Research findings** live on local `research/<name>` branches (no remote until Install gh and move the repo and map to GitHub resolves); each research ticket points at its branch and file.

## Decisions so far

- [Competitor teardown: Fitbod, MyFitnessPal, Future, padel apps](issues/03-competitor-teardown.md): Incumbents each own one Pillar (Fitbod Training, MFP Nutrition logging, Future human-coached Training, US-only); no daily readiness Check-in anywhere; padel apps are booking or tiny. Fitbod + MFP ≈ €40/mo in Greece.
- [Where is the "not a medical device" line for adaptive coaching software?](issues/04-medical-device-boundary.md): Wellness if every surface targets general fitness, performance, mobility, recovery, sleep, weight; rehab, pain diagnosis, disease-specific programs/diets, risk scores or clinical alerts make it a device (EU: Class IIa+, Notified Body). Claims, not algorithms, decide.
- [What does GDPR Article 9 require of a solo-founder health app?](issues/05-gdpr-health-data.md): All inputs are Art. 9 health data: separate explicit consent, mandatory DPIA (HDPA list) and Art. 30 records before launch; DPAs + transfer basis per processor incl. LLM; 72 h breach notice; Greek age 15; UK rep, WA MHMDA, FTC HBNR if targeted.
- [Free-tier backend platforms: limits, EU region, backups, first paid threshold](issues/06-backend-platform-free-tiers.md): Only Supabase and Appwrite bundle DB + auth + storage free; both pause after 1 idle week, have no free backups, first paid $25/mo. Neon: most generous free Postgres (EU, 6 h PITR, pay-as-you-go upgrade).
- [Free-tier hosting and IaC: commercial terms, multi-region path](issues/07-hosting-and-iac-free-tiers.md): Vercel Hobby bans commercial use; Fly has no free tier; Render Free sleeps. €0 + commercial + always-warm = Cloudflare Workers/Pages (10 ms CPU, no EU pinning); EU-pinnable alternatives Cloud Run / Deno Deploy. IaC: OpenTofu with state in R2.
- [PWA vs Capacitor vs native: iOS limits, HealthKit path](issues/08-pwa-vs-native.md): iOS PWA: push + wake lock only once installed; no background sync, no scheduled local notifications, no HealthKit. Capacitor keeps the Vue build and adds native notifications + health plugins. Apple $99/yr, Play $25 once (12 testers × 14 days).
- [LLM options for plan generation: free tiers, cost, health-data terms](issues/09-llm-options.md): Gemini free tier is barred for EEA/UK-facing apps; only Groq free and Cloudflare Workers AI are €0 without training on inputs (~2–9 Programs/day). Paid models ≈ $0.01–0.02 per Program; most DPAs exclude health data.
- [Screening and red-flag sources: PAR-Q+ licensing, ACSM screening](issues/10-screening-sources.md): PAR-Q+ and CSEP GAQ need written (possibly paid) licences for in-app use; ACSM algorithm logic and red-flag list are public, so own-worded screening is possible but can't claim 'validated'. Red flags converge across sources.
- [Exercise library sources: licensing and media](issues/11-exercise-library-sources.md): wger is the only free, commercial-OK source with media (CC-BY-SA, share-alike; 48/939 Greek); free-exercise-db is public domain but image provenance unclear; exercisedb.io $199/$599 one-time; API Ninjas free tier non-commercial.

## Not yet specified

- **Food data source**: whether a food composition database is needed, and which (Open Food Facts, USDA FDC, Greek tables), hangs on the Nutrition depth chosen.
- **API and auth details**: API style (platform-generated vs custom), auth providers (email, Apple, Google) and session model, once the backend platform is chosen.
- **Design system specifics** beyond the basics in the core-screens prototype, once the component base is chosen.
- **Payments and legal entity**: payment provider, VAT/OSS handling, and whether a company must exist before charging, once monetization is decided.
- **Analytics and consent tooling**: privacy-friendly product analytics and how it fits health-data consent, once metrics and GDPR obligations are known.
- **Product name and brand**: replacing the `stamina` codename, once the first user and positioning are settled.
- **Multi-region mechanics**: data residency per region, read replicas, routing, once DB and cloud choices exist.
- **Legal review**: research surfaced three legal calls (wger CC-BY-SA reach into Stamina's own content, own-worded screening vs licensed instruments, DPIA sign-off); whether and when a lawyer is engaged hangs on the exercise-library, safety-rules and data-model decisions.
- **Notifications and reminders**: channels (web push, local, email) and cadence, once the delivery platform is chosen.
- **Exercise library localisation**: translating exercise content into Greek and future locales, once the library source is chosen.

## Out of scope

- **Building the MVP**: this map ends at a decision-complete plan; the build hands off to `/to-spec`.
- **Kite module**: MVP sport scope is padel + general strength; kite returns as a separate effort.
- **Apple Health / Google Fit / wearables integrations**: not in the MVP build; the frontend platform decision must only keep the path open.
- **Locales beyond EN + EL**: i18n infrastructure is in scope, extra translations are not.
