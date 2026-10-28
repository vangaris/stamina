# Stamina MVP plan

Labels: wayfinder:map

## Destination

`docs/mvp-plan.md`: a decision-complete MVP plan (10 role sections, 8-week roadmap, tech-stack table, top 5 risks, decisions marked [Vang] / [External]) with nothing left to decide before Week 1 of the build. Building the MVP is beyond this map: hand off to `/to-spec` → `/to-tickets` → `/implement`.

## Notes

- **Domain**: a sport-agnostic coaching product. The user picks any sport, what they need (training, nutrition, or both), goals, equipment, schedule and food preferences; the app suggests the best approach, AI suggests Sessions and shows what to eat and drink, and Activities (games, matches) plus Check-ins and Logs trigger Adaptation suggestions such as a Deload. The Program spans four Pillars (Training, Nutrition, Mobility & Recovery, Daily Routine). Use the vocabulary in `GLOSSARY.md`.
- **Skills**: grilling tickets call `grilling` + `domain-modeling`; research tickets `research`; prototype tickets `prototype`.
- **Hard constraints on every decision**: live with real users in ≤ 8 weeks (first ~30 users; 100 by week 12); Vang part-time (~18 h/week, ≈144 h to week 8) + AI coding agents; €0 / free tiers until traction, and every service names its first paid threshold; scales to worldwide users without a rewrite (multi-region, i18n, metric/imperial, time zones); not a medical device (screening, disclaimers, red-flag rules, GDPR for health data); delivery platform and framework are decided last, on best practices (Vue 3 + TypeScript is Vang's strongest stack, weighed rather than assumed).
- **Standing preferences**: no sport-specific program is hard-coded (no CrossFit, padel or any other fixed module); `seed/` is Vang's own setup, used only as an example user; launch locales EN + EL with metric and imperial units; safety rules and nutrition logic are reviewed by a licensed professional before real users; decisions in the final document are marked [Vang] (made by Vang during grilling) or [External] (needs a third party, with needed-by week).
- **Execution override**: the final ticket, Write docs/mvp-plan.md, produces the deliverable document inside this map. Everything else produces decisions, not deliverables.
- **Research findings** live on local `research/<name>` branches (no remote until Install gh and move the repo and map to GitHub resolves); each research ticket points at its branch and file.

## Decisions so far

- [Import Vang's coaching system into seed/](issues/01-import-seed.md): seed is Vang's guide as an example user only; product is sport-agnostic, AI suggests Sessions and meals, Activities trigger Adaptation suggestions; health-app connection back in scope for MVP scope to phase.
- [Who is the first user, and how is Stamina positioned?](issues/02-first-user-and-positioning.md): 18+ intermediate amateur athletes in Athens who play any sport regularly (padel, tennis, beach volley, kite, windsurf, team sports); "the AI coach that plans training, food and recovery around the sport you play"; leads with sport-aware Adaptation; WTP test €5–10/mo.
- [MVP scope per Pillar, including Nutrition depth](issues/12-mvp-scope.md): targets + AI meal suggestions (no food logging); 11 launch sports + user requests approved by Vang; 19 post-MVP tickets incl. health-app connection and payments; free invite-only beta for ~30 users by week 8; ≈139 h at ~18 h/week.
- [Monetization and pricing](issues/13-monetization.md): 14-day no-card trial → €7.99/mo or €59.99/yr everywhere; no free tier, no ads; Paddle first; founders €39.99 first year; charging gated on week-4 retention + ≥ 30 "would pay"; register business the week payments ship.
- [Training generation model: periodization, progression, sport and Activity load](issues/15-training-generation-model.md): rolling 4-week Blocks (3 build + Deload), 5-slot Sessions; AI picks library exercises, rules set all numbers; session-RPE Load vs 4-week average drives move/swap/lighten and Deload suggestions; ~150-exercise library.
- [Core screens: Today, Session, Meals, Progress](issues/23-core-screens-prototype.md): Today = time-ordered timeline with inline suggestions and one-question Check-in; Session = one exercise per screen + full-screen rest; Meals = next-meal card; Progress = Load vs 4-week average; bottom tabs; themeable two-tier tokens.
- [Data model, database, privacy and backups](issues/20-data-model-and-db.md): Neon Postgres Frankfurt + Neon Auth (email code + Google); nightly encrypted dumps to EU R2, 30-day retention, monthly restore test; RLS + field encryption for screening; append-only revisions; one stack per region with `home_region`.
- [Cloud setup, environments, monitoring and cost guardrails](issues/21-cloud-and-environments.md): local / per-PR preview / prod with Neon branches; Cloudflare Pages frontend, Hono API on Deno Deploy EU (Cloud Run europe-west1 later); Brevo email codes, Sentry EU, UptimeRobot; OpenTofu state in R2; €5 alerts, hard AI caps, kill switch.
- [Nutrition and hydration logic](issues/17-nutrition-hydration-logic.md): Mifflin-St Jeor × non-exercise factor + (MET−1)·kg·h per Session/Activity; protein 1.6 (2.0 cutting) g/kg; carbs 3–7 g/kg by day type; drinks 1.6–2.0 L + 0.5 L/h; deterministic allergen check; ~60 fixed templates; no supplements.
- [Safety rules: screening, contraindications, red flags, never-advise list](issues/16-safety-rules.md): 9-question screening (licensed text if permitted, else own ACSM-based wording) → Referred / area excluded / cleared; Limited Block after a doctor's OK; stop flags pause training; never-advise list; 5 disclaimer placements; launch gated on physio + dietitian sign-off.
- [Generation engine: rules vs LLM vs hybrid; cost and safety controls](issues/18-generation-engine.md): rules decide all numbers and safety; Claude Haiku 5.5 only picks pre-filtered exercise IDs and writes meal ideas; no health data in prompts; strict validators + fallbacks; ≈ $2/mo, hard cap $10 (first paid cost); 50-prompt eval gate.
- [Competitor teardown: Fitbod, MyFitnessPal, Future, padel apps](issues/03-competitor-teardown.md): Incumbents each own one Pillar (Fitbod Training, MFP Nutrition logging, Future human-coached Training, US-only); no daily readiness Check-in anywhere; padel apps are booking or tiny. Fitbod + MFP ≈ €40/mo in Greece.
- [Where is the "not a medical device" line for adaptive coaching software?](issues/04-medical-device-boundary.md): Wellness if every surface targets general fitness, performance, mobility, recovery, sleep, weight; rehab, pain diagnosis, disease-specific programs/diets, risk scores or clinical alerts make it a device (EU: Class IIa+, Notified Body). Claims, not algorithms, decide.
- [What does GDPR Article 9 require of a solo-founder health app?](issues/05-gdpr-health-data.md): All inputs are Art. 9 health data: separate explicit consent, mandatory DPIA (HDPA list) and Art. 30 records before launch; DPAs + transfer basis per processor incl. LLM; 72 h breach notice; Greek age 15; UK rep, WA MHMDA, FTC HBNR if targeted.
- [Free-tier backend platforms: limits, EU region, backups, first paid threshold](issues/06-backend-platform-free-tiers.md): Only Supabase and Appwrite bundle DB + auth + storage free; both pause after 1 idle week, have no free backups, first paid $25/mo. Neon: most generous free Postgres (EU, 6 h PITR, pay-as-you-go upgrade).
- [Free-tier hosting and IaC: commercial terms, multi-region path](issues/07-hosting-and-iac-free-tiers.md): Vercel Hobby bans commercial use; Fly has no free tier; Render Free sleeps. €0 + commercial + always-warm = Cloudflare Workers/Pages (10 ms CPU, no EU pinning); EU-pinnable alternatives Cloud Run / Deno Deploy. IaC: OpenTofu with state in R2.
- [PWA vs Capacitor vs native: iOS limits, HealthKit path](issues/08-pwa-vs-native.md): iOS PWA: push + wake lock only once installed; no background sync, no scheduled local notifications, no HealthKit. Capacitor keeps the Vue build and adds native notifications + health plugins. Apple $99/yr, Play $25 once (12 testers × 14 days).
- [LLM options for plan generation: free tiers, cost, health-data terms](issues/09-llm-options.md): Gemini free tier is barred for EEA/UK-facing apps; only Groq free and Cloudflare Workers AI are €0 without training on inputs (~2–9 Programs/day). Paid models ≈ $0.01–0.02 per Program; most DPAs exclude health data.
- [Screening and red-flag sources: PAR-Q+ licensing, ACSM screening](issues/10-screening-sources.md): PAR-Q+ and CSEP GAQ need written (possibly paid) licences for in-app use; ACSM algorithm logic and red-flag list are public, so own-worded screening is possible but can't claim 'validated'. Red flags converge across sources.
- [Exercise library sources: licensing and media](issues/11-exercise-library-sources.md): wger is the only free, commercial-OK source with media (CC-BY-SA, share-alike; 48/939 Greek); free-exercise-db is public domain but image provenance unclear; exercisedb.io $199/$599 one-time; API Ninjas free tier non-commercial.
- [What does a Greek solo founder need to sell EU consumer subscriptions, and what does each channel cost?](issues/30-selling-subscriptions-from-greece.md): Register (έναρξη, free, same day on gov.gr) before the first charge; e-ΕΦΚΑ ≥ €160/month from then, regardless of revenue. Fees: Stripe ≈2.2%+€0.25 (self-VAT/OSS, per-charge myDATA), Paddle 5%+$0.50 (MoR, bans 'coaching'), Apple 15% / EU 10%, Google 10%+5%.

## Not yet specified

- **API contract style**: REST + OpenAPI vs typed RPC between frontend and the Hono API (Cloud setup), once the delivery platform is decided.
- **Brand theme**: the real palette, typography and logo, applied through the theme layer (Core screens: two-tier tokens) once the product name and brand are settled.
- **Payment provider**: which provider or store billing mix to integrate, once monetization and the legal/channel research (What does a Greek solo founder need to sell EU consumer subscriptions…) are resolved; lands on post-MVP Payments and subscriptions.
- **Analytics and consent tooling**: privacy-friendly product analytics and how it fits health-data consent, once metrics and GDPR obligations are known.
- **Product name and brand**: replacing the `stamina` codename, once the first user and positioning are settled.
- **Legal review**: research surfaced three legal calls (wger CC-BY-SA reach into Stamina's own content, own-worded screening vs licensed instruments, DPIA sign-off); whether and when a lawyer is engaged hangs on the exercise-library, safety-rules and data-model decisions.
- **Notifications and reminders**: channels (web push, local, email) and cadence, once the delivery platform is chosen.
- **Exercise library localisation**: translating exercise content into Greek and future locales, once the library source is chosen.

## Out of scope

- **Building the MVP**: this map ends at a decision-complete plan; the build hands off to `/to-spec`.
- **Post-MVP increments**: everything MVP scope rules out of the 8 weeks is a backlog ticket in `.scratch/post-mvp-increments/issues/` with a proposed increment number; the roadmap ticket orders them and the plan document lists them.
- **Injury- or pain-specific routines, rehab**: never, in any increment (medical-device boundary).
- **Locales beyond EN + EL**: i18n infrastructure is in scope, extra translations are not.
