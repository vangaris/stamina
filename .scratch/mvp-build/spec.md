# Stamina MVP: build spec

Status: ready-for-agent

Source plan: `docs/mvp-plan.md` (decisions and evidence in `.scratch/mvp-plan/issues/`). Vocabulary: `GLOSSARY.md`.

## Problem Statement

I play a sport regularly: padel twice a week, kitesurfing when the wind is up, or a basketball league. I also want to get stronger, eat right and recover well. Every app I can use plans one thing in isolation and has no idea what I actually played. So I train legs hard the day before a match, under-recover after a windy afternoon on the water, and eat the same on sport days as on rest days. I patch it together from a gym app, a calorie counter, YouTube and guesswork. Nothing reacts when my week changes. Nothing tells me what to eat and drink for the day I'm actually having. And I don't trust generic apps to notice when I shouldn't train at all.

## Solution

Stamina is a mobile-first web app (PWA) and an AI coach that plans my training, food and recovery around the sport I play, and adapts when I've played.

- **Onboarding**: in a few minutes I say what I want (training, food or both), my sport and when I play, my Goal and my training week, and I answer a short health Screening. I then get a Program: rolling 4-week Blocks of Sessions placed around my sport days.
- **Every day** I see a Today timeline with my Session, what to eat and drink, and a 3-tap Check-in.
- **When I play** (planned or not) I log it in one tap. When I feel rough, the Check-in says so. Stamina then **suggests** a change (move, lighten or swap a Session, or a Deload) with a plain reason, and I accept or decline.
- **During a Session** I log sets one exercise at a time, with a rest timer.
- **Meals**: I see meal ideas that fit my eating pattern and allergies, with targets for the day type.
- **Safety**: if I report a warning symptom, Stamina stops me and points me to medical help.
- **Languages**: everything works in English and Greek, offline in the gym, and my health data stays in the EU.

## User Stories

### Access, account and consent
1. As a new visitor with an invite code, I want to start onboarding from the invite link, so that I can join the invite-only beta.
2. As a new user, I want to say whether I want a training program, what to eat and drink, or both, so that Stamina only asks what's relevant.
3. As a new user, I want to enter my birth year first, so that Stamina stops me immediately if I'm under 18, before any health question.
4. As a new user, I want to declare my country of residence, so that Stamina only lets EU/EEA residents into the beta.
5. As a user under 18, I want a clear "Stamina is for adults" message with nothing saved, so that I'm not asked for health data.
6. As a non-EU/EEA resident, I want a clear "available in the EU/EEA for now" message, so that I understand why I can't continue.
7. As a new user, I want to read and accept a short wellness disclaimer before any health question, so that I know Stamina isn't a medical service.
8. As a new user, I want a separate, unticked explicit-consent box for health data that explains what is collected, where it's stored and how to withdraw, so that I give informed consent.
9. As a new user, I want to save my plan with an email code or Google, without a password, so that sign-in is quick and safe.
10. As a returning user, I want to sign in with an emailed one-time code, so that I can use any device.
11. As a user, I want to choose English or Greek and metric or imperial units, pre-filled from my phone, so that the app speaks my language and units.
12. As a user, I want to export all my data in one tap (JSON, plus CSV of my Logs), so that I own my data.
13. As a user, I want to delete my account and have everything erased within 30 days, so that I can leave cleanly.
14. As a user, I want to withdraw consent for health data and be offered export and then deletion, so that withdrawing is as easy as consenting.
15. As an active user, I want 3 invite codes for teammates or training partners, so that I can bring my team.

### Sport, Goal and schedule
16. As a user, I want to pick my sport from the 11 launch sports, so that my Program fits what I play.
17. As a user whose sport isn't listed, I want to request it by name and get a beta Program right away, so that I'm not blocked.
18. As the founder, I want requested sports drafted as Sport Profiles that I approve before they're shared with everyone, so that no unchecked sports-science reaches users.
19. As a user, I want to say which days I usually play, or that "it varies" (weather, pickup games), so that Stamina plans around my sport.
20. As a user, I want to give my usual duration and intensity for my sport, so that its Load is estimated correctly.
21. As a kitesurfer, windsurfer or beach-volleyball player, I want "hot conditions" on by default in summer, so that hydration targets rise without effort.
22. As a user, I want to choose one Goal (play better, get stronger, general fitness, body composition), so that Blocks and Nutrition match what I want.
23. As a user, I want to set Sessions per week (2–4), Session length (30/45/60 min) and available days, so that the plan fits my life.
24. As a user, I want to tell Stamina my equipment, or see that it assumed bodyweight + dumbbells until I do, so that exercises are doable.

### Screening and safety
25. As a new user, I want to answer 10 yes/no health questions on one page, each saying "if unsure, answer yes", so that Screening is fast but cautious.
26. As a user who answers yes to a symptom, known condition, concussion, pregnancy or supervised-exercise question, I want a calm "let's check with a professional first" screen with no diagnosis, so that I know what to do.
27. As a referred user, I want to come back after stating "a doctor has said I can train" and get a Limited first Block (effort capped, no explosive work), so that I can start safely.
28. As a pregnant user, I want referral wording that mentions my doctor or midwife, and no Limited path, so that the advice fits me.
29. As a user with a bone, joint or muscle problem, I want to pick the body areas to avoid and have exercises that load them left out, so that I can still train.
30. As a user being treated for an eating disorder, I want Nutrition switched off and the body-composition Goal unavailable, while Training continues, so that the app doesn't push food targets on me.
31. As a user, I want to be asked the Screening again every 12 months, or when I tap "my health has changed", so that my answers stay current.
32. As a user, I want an "Anything unusual today?" row in my Check-in and a Stop button in every Session, so that I can report warning symptoms.
33. As a user reporting chest pain, fainting, unusual breathlessness or a racing heartbeat, I want the Session stopped, the local emergency number shown, and training paused until I confirm a doctor has seen me, so that I don't push through danger.
34. As a user with a fever, I want today turned into rest, so that I don't train ill.
35. As a user with new pain or swelling, I want that area excluded and a prompt to get it checked, so that I don't aggravate it.
36. As a user who took a knock to the head, I want training paused until I confirm a doctor has cleared me, so that I stay safe.
37. As a user, I want to see the disclaimer at the first Session of each Block, in the Meals footer and in Settings → Safety, so that the limits stay clear.

### Program and Sessions
38. As a user, I want to see my first week right after onboarding (Block 1 emphasis, Sessions placed around my sport days), so that I know the plan immediately.
39. As a user, I want rolling 4-week Blocks (3 build weeks, then a Deload), so that I progress without burning out.
40. As a user, I want each Session to have warm-up, main strength, sport support, accessories & core, and cool-down, scaled to my chosen length, so that every Session is complete.
41. As a user, I want no heavy leg Session inside my sport's recovery window before a hard match, so that I play fresh.
42. As a user, I want at least one day a week with no Session and no hard Activity planned, so that I recover.
43. As a user, I want exercises chosen for my sport's demands and high-load body areas, from a curated library, so that training transfers to my sport.
44. As a user in the gym, I want one exercise per screen with big weight and rep steppers and RPE chips, so that logging is easy with sweaty hands.
45. As a user, I want a full-screen rest timer that keeps the screen on, so that I rest the right amount.
46. As a user, I want a table overview of the whole Session, so that I can see what's coming.
47. As a user, I want to swap an exercise for an easier or harder variant, so that I can adapt to the equipment available.
48. As a user, I want week-1 weights guided by "a weight you could lift 2–3 more times", with no max testing, so that I start safely.
49. As a user, I want the next Session to add weight when I hit the top of the rep range at or below target effort, and drop it when sets are much harder than planned, so that progression is automatic and sensible.
50. As a user, I want to rate the whole Session (RPE 1–10) when I finish, so that its Load counts.
51. As a user in a gym basement with no signal, I want my sets and Session to save offline and sync later, so that nothing is lost.

### Activities, Check-ins and Adaptation
52. As a user, I want to log "I played" (sport, duration, effort) in one tap, and see its Load, so that Stamina knows what I did.
53. As a user, I want a 3-tap daily Check-in (sleep, soreness, energy, each 1–5), one question per screen, so that it takes seconds.
54. As a user who played hard unexpectedly, I want a suggestion to move the next Session a day, or swap it for recovery, or lighten it, with the reason in numbers, so that I can decide.
55. As a user with a poor Check-in, I want a lighter version of today's Session suggested, so that I train within my state.
56. As a user, I want a great Check-in never to make my Session harder, so that I'm not pushed into risk.
57. As a user, I want an early Deload suggested when my Load stays well above my usual for two weeks, or my Check-ins stay poor, so that I recover before I break.
58. As a user, I want to accept or decline ("keep my plan") every suggestion, and nothing to change automatically, so that I stay in control.
59. As a user, I want a declined Deload suggestion to come back after 3 days only if the reason still holds, so that I'm not nagged.
60. As a user, I want missed Sessions skipped rather than stacked, a repeated week after missing two, and a restarted Block after a long break, so that the plan stays realistic.
61. As a user, I want to accept a suggestion offline and have it applied when I'm back online (or be shown the newer plan if it changed), so that offline use is safe.

### Nutrition and hydration
62. As a Nutrition user, I want to add my height, weight, sex for the energy formula, everyday activity, eating pattern, the 14 EU allergens, dislikes, meals per day and cooking effort, so that Meals unlock and fit me.
63. As a Nutrition user, I want daily targets for energy, protein, carbs, fat and drinks that change with the day type (rest, Session, Activity, hard Activity), so that I eat for the day I'm having.
64. As a Nutrition user losing fat, I want a modest deficit that never applies on hard Activity days and never goes below my resting energy, so that I don't under-fuel.
65. As a Nutrition user, I want the deficit halved automatically if I'm losing more than 1% of bodyweight a week for two weeks, with a reason, so that the plan stays safe.
66. As a Nutrition user whose rate check fires twice, I want a "talk to a dietitian or doctor" prompt, so that I get help if something's off.
67. As a Nutrition user, I want a next-meal card with an AI meal idea in household measures that fits my pattern and avoids my allergens and dislikes, so that I know what to eat now.
68. As a Nutrition user, I want to mark each meal "ate it / something else / skipped" in one tap, so that logging is effortless.
69. As a Nutrition user, I want up to 3 "another idea" taps a day, then fixed templates, so that I have choice.
70. As a Nutrition user, I want allergens never to depend on the AI (a fixed rule check on every meal, with a fallback template), so that I can trust the suggestions.
71. As a user, I want water targets that rise with training hours and heat, a cue to drink before an Activity, an electrolyte note for long or hot Activities, and a "drink to thirst" cap, so that I hydrate safely.
72. As a user, I want quick "+250 ml / +500 ml" water logging, so that tracking takes no effort.
73. As a user, I want meal and exercise suggestions labelled "Suggested by AI", so that I know where they come from.
74. As a user, I want no supplement advice and no claims that food prevents or treats anything, so that the guidance stays honest.

### Today, Progress and reminders
75. As a user, I want a Today timeline (meals, Session, Activities, water, wind-down) in time order, with suggestions inline at the top, so that my day is in one place.
76. As a user, I want a daily Check-in reminder at the time I choose, by push if I installed the app, or by email otherwise, so that I don't forget.
77. As an iOS user, I want a one-screen guide to adding Stamina to my Home Screen, so that push reminders and reliable storage work.
78. As a user, I want Progress to show Sessions done vs planned, my weekly Load vs my 4-week average, and a one-sentence verdict, so that I see how my week is going.
79. As a beta user, I want a feedback button, and a "would you pay €7.99/month?" question in my 4th week, so that I can shape the product.
80. As a Greek speaker, I want every screen, exercise, meal idea and safety message in natural Greek, so that the app feels native.

### Founder operations
81. As the founder, I want to approve requested Sport Profiles in the database table editor, so that I can control what everyone sees without an admin screen.
82. As the founder, I want a daily digest (sign-ups, Check-ins, AI cost so far, backup result, restore-test result), so that I can run the beta in minutes a day.
83. As the founder, I want AI spend capped (provider hard cap, per-user daily cap, a global kill switch that falls back to rules and templates), so that costs can never run away.
84. As the founder, I want the beta metrics (activation, W1/W4 retention, adherence, Check-in rate, Adaptation acceptance, meal Log rate, would-pay count, NPS) computed from our own data, so that I can judge the charging gate without third-party analytics.
85. As the founder, I want health data never to appear in logs, error reports, analytics or AI prompts, so that privacy holds even when something breaks.

## Implementation Decisions

**Delivery and structure**
- **Web**: a Vue 3 + Vite + TypeScript PWA with Pinia, Vue Router, vite-plugin-pwa and vue-i18n (ICU), and custom Tailwind v4 components on semantic tokens; no component library. React Native comes in a later increment.
- **Monorepo**: pnpm + Nx; one package per UI component and per shared utility; Nx tags enforce boundaries (UI and util depend on nothing app-specific; domain depends only on util; app-core depends on domain, contracts and util; scope tags keep Vue and React apart).
- **Modules**:
  - **web app** and **API app**;
  - **domain**: pure rules for Load, Block and Session structure, progression, Deload, weekly placement, Adaptations, nutrition targets, hydration, Screening outcomes, stop flags, Limited mode, units and dates;
  - **app-core**: mediator, commands and queries, handlers, pipeline steps, service factories, storage and transport interfaces; no Vue or React;
  - **contracts**: zod schemas, OpenAPI, typed client;
  - **tokens**: DTCG JSON in primitive and semantic tiers, compiled to CSS variables for light and dark (and later a React Native theme);
  - **i18n**: EN/EL ICU messages;
  - **UI component packages**: button, chip, chip-group, stepper, checkbox, text-field, card, sheet, tabs, bottom-nav, progress-bar, ring, load-bars, rest-timer, toast, suggestion-card, meal-card;
  - **util packages**: dates, units, ids, format, safe-log.
- **Client layering**:
  - container component → one composable → `mediator.send(command | query)` → pipeline (validate → log-safe → offline-queue → error-map → timing) → handler function → domain + services from `createServices(env)` → API client or local storage.
  - Handlers write to stores; stores hold state only; presentational components take props and emit events.
- **Server**: a Hono app on Deno Deploy EU.
  - The domain rules run here and **the server is authoritative**: it computes Programs, Adaptations, targets and outcomes.
  - The client may reuse domain functions for instant feedback (e.g. a Load preview), but the server value wins.

**API contract**
- REST over Hono with zod schemas published as OpenAPI; typed client generated in contracts; runtime validation on both sides.
- Commands are POSTs carrying a client-generated UUIDv7; **the server ignores a repeat of an ID it already has**.
- **Main operations**:
  - auth via Neon Auth;
  - profile and onboarding answers;
  - Screening submit, outcome and "doctor said I can train";
  - sport list and sport request;
  - get today, week and Session;
  - log set; finish Session; log Activity; submit Check-in; report stop flag;
  - list and accept/decline Adaptations (accept carries the Session revision it applies to; **a stale revision is rejected**);
  - get nutrition day; log meal; regenerate meal idea; log water;
  - export, delete account, withdraw consent;
  - feedback and would-pay;
  - invites.

**Data model** (Neon Postgres Frankfurt, Drizzle forward-only migrations with RLS policies included)

| Entity | Notes |
|---|---|
| user / profile | birth year, country, `home_region`, locale, units, time zone, Goal, Sessions per week and minutes, available days, equipment, locations, sex for energy, height, weight, everyday activity, eating pattern, allergens, dislikes, meals per day, cooking effort |
| consent | append-only: purpose, text version (EN/EL), granted at, withdrawn at |
| screening | instrument + version, **answers field-encrypted**, outcome (cleared / limited / referred / nutrition-off), area exclusions, doctor-OK statement, taken at |
| stop_flag | type, reported at, paused until confirmed |
| sport | name, status draft / approved / rejected, requested by, Sport Profile JSON (energy mix, key movements, high-load areas, typical Activity, recovery window, season, METs per intensity), sources, approved by, version |
| user_sport | sport, play days or "varies", duration, intensity, hot default |
| exercise | source, licence, image, attribution, EN/EL name and instructions, tags: equipment, location, movement pattern, high-load areas, slot, RIR-suitable, easier/harder variant |
| program / block | emphasis, start, Limited flag |
| session | date, status, revision, `supersedes_id`, `rules_version`, `model`, `prompt_version`, inputs hash |
| session_exercise / set_log / session_log | slot, sets, rep range, RIR, load / weight, reps, RPE / session RPE, minutes |
| activity | sport, date, minutes, RPE, Load, planned or not, hot, source |
| checkin | sleep, soreness, energy (1–5) |
| nutrition_day | day type, targets |
| meal_suggestion / meal_log | slot, ingredient IDs with portions, protein estimate, text per locale, validator outcomes / ate, other or skipped |
| water_log | ml |
| adaptation | rule ID, trigger refs, change, reason params, status, decided at |
| ingredient | ID, EN/EL names, allergen tags, household units (~300) |
| meal_template | ~60, tagged by pattern and allergens |
| llm_call | pseudonymous user, purpose, model, tokens, cost |
| feedback | free text, would-pay answer, NPS |
| invite | code, issuer, redeemed by |

- Logs, Check-ins, Activities, Adaptations, consents and stop flags are append-only; accepted Adaptations create Session revisions.
- RLS restricts every row to its owner.
- Deletion hard-deletes within 30 days; inactive accounts are deleted after 24 months with a 30-day warning.

**Engine rules (domain)**: exactly as decided in Training generation model, Nutrition and hydration logic, and Safety rules. The essentials:

| Rule | Value |
|---|---|
| Load | session RPE × minutes |
| Weekly comparison | against the user's own 4-week average |
| Blocks | 3 build weeks + Deload; RIR 3 → 2 → 1 → 4, Deload halves the sets |
| Rep ranges | Strength 4–6 @ RIR 2; Power & speed 3–5 fast @ RIR ≥ 3; Strength-endurance 10–15 @ RIR 2 |
| Load increase | +2.5 kg upper / +5 kg lower when all sets reach the top of the range at or below target; −5 % after 2 sets at ≥ target + 2 |
| Weekly placement | no heavy Session for a body area inside the recovery window before a hard Activity; no Session on a hard-Activity day; ≥ 1 free day; heavy upper and lower on different days |
| Volume flex | weekly Load within +10 % of the average in build weeks |
| Adaptation triggers | unplanned hard Activity → move ±1 day, else swap to recovery, else −1 set per exercise; Check-in with 2 of 3 answers ≤ 2 → lighter version; soreness ≤ 2 in a targeted area → swap those exercises; Load > 1.3 × average for 2 weeks, or 3 poor Check-ins in 5 days, or 2 Sessions at target + 2 → suggest early Deload, re-ask after 3 days; never increase load |
| Missed Sessions | skip; ≥ 2 missed in a week → repeat the week; ≥ 2 weeks off → restart at week 1 with RIR + 1 |
| Energy | Mifflin-St Jeor (midpoint −78 for "prefer not to say") × non-exercise factor 1.4 / 1.5 / 1.7, plus (MET − 1) × kg × h per Session or Activity |
| Goal adjustment | fat loss −400 kcal (never on hard-Activity days); muscle gain +250 kcal; floor = resting energy; > 1 %/week loss for 2 weeks → deficit halved |
| Macros | protein 1.6 g/kg (2.0 when losing fat); carbs 3 / 4 / 5 / 6–7 g/kg by day type; fat ≥ 20 % |
| Drinks | 2.0 / 1.6 / 1.8 L + 0.5 L/h (+0.25 L/h hot); capped at 1 L per hour of exercise |
| Screening outcomes | 9a, 1, 2, 3, 4, 5, 7, 8 → referred; 9b → Nutrition off; 6 → area excluded; doctor-OK → Limited (RPE ≤ 7, no power/plyo slot, no RIR 1) |
| Stop flags | cardiac / syncope / breathing / palpitations → pause until a doctor-seen confirmation; fever → rest; new pain → area excluded; head knock → pause |

**AI layer** (behind one provider interface; Anthropic Claude Haiku 5.5 in production; a fake in tests)
- **Jobs**:
  - fill Session slots with exercise IDs from a rules-pre-filtered candidate list, plus a pick reason;
  - write meal ideas as ingredient IDs with household portions, a protein estimate and text in the user's locale.
- **Prompts never contain** user ID, age, sex, weight, Check-ins, Screening, stop flags or clearance statements. Allergens are merged into an unlabelled avoid list.
- **Validators**: strict schema; IDs within candidates; slot counts; no duplicates; ingredient-ID allergen check; EN/EL never-advise term filter; protein within ±30 %.
- **Fallbacks**: Sessions get 1 retry, then the rules-only picker; meals get 2 regenerations, then a fixed template.
- Results are stored with model, prompt version, inputs hash and validator outcomes.
- **Caps**: provider hard cap $10/month; 15 calls per user per day; 3 "another idea" per day; global kill switch at 80 % of the cap.
- **Caching**: Session picks are generated weekly per user; meal ideas per day on first open, cached, and regenerated only when the day type changes.
- **Explanations**: Adaptation reasons come from EN/EL templates filled with rule parameters; never AI text.

**Offline**: Logs, Check-ins, Activities, meal Logs, water and Adaptation decisions are written to IndexedDB (Dexie) through the factory's offline service and synced on app open, focus or `online` events. The week's plan, today's meals and the exercise library are cached.

**Reminders**: a scheduled job sends daily Check-in reminders at each user's local time, by web push when installed, otherwise by Brevo email. Deno Deploy cron if supported; otherwise a GitHub Actions schedule calls an internal endpoint.

**Localisation**: EN is the source; CI fails on a missing EL key. Style guide: informal «εσύ», gym terms with the English name on first use, Greek number format. Exercise, ingredient and template content carries EN/EL fields. The LLM writes in the user's locale.

**Onboarding flow** (from the onboarding prototype, branch `prototype/onboarding`): needs + birth year + country → sport + when you play → Goal → training week → disclaimer + consent → starting level + 10 Screening questions (+ body-area picker) → account → reveal. "Finish setup" cards cover equipment and Meals.

**Core screens** (from the core-screens prototype, branch `prototype/core-screens`):
- **Today**: timeline, inline suggestion cards, one-question Check-in, ＋ I played.
- **Session**: focus mode, full-screen rest timer, table overview, Stop button.
- **Meals**: next-meal card, targets, water, day list.
- **Progress**: Sessions done, Load bars vs average, verdict.
- **Navigation**: labelled bottom tabs.

**Infrastructure**:

| Concern | Choice |
|---|---|
| Environments | local / per-PR preview (Cloudflare Pages + Deno Deploy + Neon branch) / production |
| Infrastructure as code | OpenTofu (state in R2) for Cloudflare, Neon, Sentry; scripts for Deno Deploy, UptimeRobot, Brevo |
| Backups | nightly encrypted `pg_dump` to EU R2, kept 30 days; monthly restore test |
| Monitoring | Sentry EU with PII scrubbing; UptimeRobot on `/health`; daily digest |
| Logging | allowlisted fields only, 14-day retention |
| Rate limits | per user |

**Engineering**: trunk-based squash merges; Conventional PR titles; release-please; CI per PR (nx affected lint / typecheck / tests / build, Gitleaks, OSV-Scanner, preview, Playwright + axe, prompt eval on prompt changes, `tofu plan` on infra changes); agents work only via PRs; CODEOWNERS on safety-critical paths.

## Testing Decisions

- **A good test** exercises external behaviour through a seam: given a fixture user and a request, assert what the user would see or what the system stored. Tests never assert on internal function calls, private helpers, store shapes or copy wording.
- **Seam 1: API over HTTP (the main seam).**
  - The real Hono app runs against real Postgres (a Neon branch in CI, local Postgres in dev), with the AI provider replaced by a deterministic fake implementing the provider interface.
  - It covers everything server-side: Program generation and weekly placement, progression, Deload triggers, Adaptations from Activities and Check-ins (including move → swap → lighten ordering and never-harder), missed-Session handling, Screening outcomes and Limited mode, stop-flag pauses, nutrition targets per day type and floors, the hydration cap, allergen fallback, idempotent writes, stale-revision rejection, RLS isolation between users, export completeness, deletion, AI validators and fallbacks, and caps / kill switch.
  - **The domain rules are tested through this seam**, not unit by unit.
  - **Fixture users**: Vang's seed persona (padel + kite), a basketball player with 2 games a week, a kitesurfer with weather-dependent Activities, a referred-then-Limited user, a vegan with a tree-nut allergy, an under-18 and a non-EEA applicant.
- **Seam 2: `app-core` mediator.**
  - Commands and queries are sent through a mediator built with `createServices(ServicesMode.Test)` mocks.
  - It covers offline queueing and sync, retries, idempotent replays, stale-Adaptation handling, error mapping, the log-safe pipeline (no health fields in logs) and store updates.
  - Shared by web and the later React Native app.
- **Seam 3: browser journeys (Playwright at phone size on each PR preview, with axe).**
  - Onboarding → reveal (including a referral path).
  - A Session logged offline, then synced.
  - "I played" → accept suggestion.
  - Logging a meal and water.
  - An EL-locale smoke run.
- **Outside the seams**: the 50-prompt EN/EL evaluation set (≥ 98 % validator pass rate) gates any prompt change. It tests AI output quality, not product behaviour.
- **Prior art**: none in the codebase (greenfield). The two HTML prototypes on `prototype/*` branches are behavioural references for the journeys.

## Out of Scope

- Everything in `.scratch/post-mvp-increments/issues/`:
  - payments and subscriptions (until the charging gate passes);
  - weekly re-plan; Check-in trends and Adaptation history screens; pre-Session reminders; sport review-queue screen;
  - landing page; brand theme;
  - React Native apps and Apple Health / Health Connect;
  - food logging and food database; video demos; custom Sessions; event prep; sport-specific Session programming;
  - weather feed; adaptive energy targets; personalised guidance cards;
  - social; coach and team accounts; wearables; AI chat; progress extras; camera form check;
  - locales beyond EN/EL.
- Never in any increment: injury-, pain- or rehab-specific routines; diagnosis; supplement or medication advice.
- Non-EU/EEA users during the beta.
- An admin UI: sport approval happens in the database table editor.
- Third-party product analytics.

## Further Notes

- **Launch gate** (no real users before all are done): physio and dietitian sign-offs, lawyer review closed, DPIA final, restore test passed, kill switch tested.
- **Non-code work tracked in `docs/mvp-plan.md` §14**: licence emails, reviewer and lawyer booking, legal drafts, product name, admin.
- **Screening wording** is licensed PAR-Q+/GAQ text if permission arrives, otherwise Stamina's own wording. The outcome logic is identical either way.
- **Budget**: ≈ 152 h at 19 h/week with no slack. If the build runs over, apply the pre-agreed cuts in order:
  1. Progress → Sessions only;
  2. "another idea" → templates;
  3. 11 → 7 launch Sport Profiles;
  4. "Other" sport → Activity-only;
  5. meal ideas → templates for the first 2 weeks.
- **Next step**: `/to-tickets` slices this spec into GitHub issues on the Projects board, ordered by the roadmap weeks.

## Tickets

Published by `/to-tickets`: 23 tracer-bullet tickets in `issues/` (01 walking skeleton → 23 launch hardening), numbered in dependency order with blocking edges and roadmap weeks. Frontier at publication: 01.
