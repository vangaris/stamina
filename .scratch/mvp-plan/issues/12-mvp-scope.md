# MVP scope per Pillar, including Nutrition depth

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

What is in and out of the MVP for each Pillar (Training, Nutrition, Mobility & Recovery, Daily Routine), for Check-ins, Logs, Activities and Adaptation, and for accounts/social/coach features? In particular:

- **Nutrition depth**: macro and hydration targets only, template meals, AI-suggested meals ("what to eat and drink today"), or food logging?
- **Sport coverage**: Vang wants any sport selectable with no hard-coded sport programs. Does "any sport" at launch mean free-text sport handled by AI, or a curated list of sport profiles the engine knows (with free text later)? If curated, the first-user decision fixes the launch list's core: padel, tennis, beach volleyball, kitesurfing, windsurfing, basketball, 5-a-side football.
- **Health-app connection**: Vang wants Stamina to connect with a health app (Apple Health / Google Health Connect) so Activities and workouts feed Adaptation and the app shows what to eat and drink. Per the platform research this needs a native shell (Capacitor) and the Apple Developer Program at $99/yr, which breaks the €0 constraint: is it in the 8-week MVP (read-only import of workouts?), or week-9+, with manual Activity logging at launch?

Output: an in/out table per Pillar that fits 8 weeks at Vang's weekly hours with AI agents.

## Comments

- 2026-10-28 round 1 (Vang):
  - Q1 Nutrition depth: accepted (b) daily targets + AI meal suggestions honouring preferences/allergies, household-measure portions, sport-day fluid/carb bump; no food logging, barcode or food DB in MVP.
  - Q2 Sport coverage: users can request a sport; once added it is available to all users. Launch list widens beyond the first-user list: running, CrossFit, HYROX, calisthenics, etc. (approval flow and final list in round 2).
  - Q3 Health-app connection: not in the 8 weeks; first post-MVP increment, shipped first as a beta (Play closed testing / TestFlight; TestFlight still needs the US$99/yr Apple account). MVP logs Activities manually.
  - General: delivery platform and framework (PWA, Capacitor, React Native, native…) are decided last, on best practices. Delivery platform and frontend architecture now waits on the engine, onboarding and core-screens tickets; core screens no longer waits on it; engineering process waits on it.
  - Q4–Q9 accepted. Everything ruled out becomes a post-MVP backlog ticket: `.scratch/post-mvp-increments/issues/01–11`. Injury/pain-specific routines stay excluded forever (medical-device boundary), so no ticket.
- 2026-10-28 round 2 (Vang accepted all recommendations):
  - Q10 Sport request: AI drafts a sport profile instantly → requester gets a beta Program on it → Vang approves → available to all users; rejected stays beta for the requester.
  - Q11 Launch list (11): padel, tennis, beach volleyball, kitesurfing, windsurfing, basketball, 5-a-side football, running, CrossFit, HYROX, calisthenics.
  - Q12 Training-modality sports (CrossFit, HYROX, running, calisthenics) are Activities in the MVP; Stamina's Sessions support them. Writing the sport itself → post-MVP 13.
  - Q13 Event-date peaking/taper → post-MVP 14.
  - Q14 Meal Log: one tap per suggested meal (ate it / ate something else / skipped).
  - Q15 Reminders: daily Check-in prompt + pre-Session heads-up; channel per delivery-platform ticket.
  - Q16 No payment code in 8 weeks; free invite-only beta with in-app feedback; payments → post-MVP 12.
- 2026-10-28 round 3 (Vang accepted): all seven capacity cuts (−23 h → ≈139 h); close the remaining gap with option (a), ~18 h/week (≈144 h). Cuts became post-MVP 15–19.

## Answer

**Budget**: ≈139 h of in-scope work (rough estimate, refined by the roadmap ticket) against ~18 h/week × 8 = ≈144 h. **Week 8 = ~30 real users** from Vang's network in a **free, invite-only beta** with an in-app feedback button; 100 users by week 12.

| Area | In the MVP | Out (post-MVP ticket in `.scratch/post-mvp-increments/issues/`) |
|---|---|---|
| Sports | 11 launch sports: padel, tennis, beach volleyball, kitesurfing, windsurfing, basketball, 5-a-side football, running, CrossFit, HYROX, calisthenics. Any other sport by request: AI drafts the sport profile, the requester gets a beta Program, Vang approves it in the DB table editor, then it is shared with everyone. All 11 launch profiles go through the same pipeline and Vang reviews them as one batch. | Review-queue screen (18); writing the sport itself as Sessions, e.g. running plans or WODs (13); event-date peaking/taper (14) |
| Training | AI-suggested Sessions checked against progression, Deload and safety rules; Session screen with set logging (weight, reps, RPE), rest timer, exercise swap; library images + text | Video demos (03); user-built Sessions (04); camera form check (10) |
| Activities | One-tap manual Activity log (sport, duration, intensity), counted in weekly load; CrossFit, HYROX, running and calisthenics are Activities that Stamina's Sessions support | Health Connect / Apple Health import, beta first (01); wearables (07) |
| Check-ins & Adaptation | Daily 3-tap Check-in (sleep, soreness, energy) + Session RPE; Adaptation suggestions after an Activity or a poor Check-in; accept/decline; nothing auto-applies | Weekly re-plan (15) |
| Nutrition | Daily targets (kcal, protein, carbs, fat, water) by day type; AI meal suggestions honouring preferences and allergies, household-measure portions, sport-day fluid and carb bump; one-tap meal Log (ate it / something else / skipped) | Food logging, food DB, barcode (02) |
| Mobility & Recovery | Warm-up and cool-down attached to each Session; 10–15 min recovery Sessions after hard Activities; fixed, reviewed sleep and hydration guidance cards | Personalised guidance cards (19). Injury/pain-specific or rehab routines are **never** built (medical-device boundary) |
| Daily Routine | The Today timeline: Sessions, Activities, meal times, hydration prompts and sleep wind-down in one ordered list; no separate habit tracker | none |
| Progress | Planned vs done Sessions; weekly load (Sessions + Activities); optional weekly weigh-in | Check-in trends and Adaptation history screen (17; data stored from day one); body composition, photos, PR leaderboards (09) |
| Reminders | Daily Check-in prompt (channel set by the delivery-platform ticket) | Pre-Session reminders (16) |
| Accounts & compliance | One account per user; sign-in; data export, account deletion, consent withdrawal; screening, red-flag exits, disclaimers; DPIA, records of processing, privacy policy | Social and sharing (05); coach and team accounts (06); AI chat (08) |
| Money | None: free invite-only beta | Payments and subscriptions (12) |
| Locales | EN + EL, metric and imperial, time zones | More locales (11) |

**Delivery platform** (PWA, Capacitor, React Native, native…) is not part of scope: it is decided last, on best practices, in Delivery platform and frontend architecture.

**Propagated**:
- The map's hard constraints now read ~18 h/week and ~30 users by week 8.
- The "Food data source" fog is cleared: food logging went post-MVP, so its data source now sits on post-MVP 02.
- The "Sport demand data" fog graduated into Training generation model: AI-drafted profiles on a fixed schema, with Vang's review checklist.
- Success metrics and go-to-market is reframed for the beta: no conversion metric, ~30 users by week 8, 100 by week 12.
- Roadmap now carries the ≈139 h / ≈144 h budget.
