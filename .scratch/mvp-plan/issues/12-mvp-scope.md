# MVP scope per Pillar, including Nutrition depth

Type: grilling
Status: claimed
Blocked by: 01, 02

## Question

What is in and out of the MVP for each Pillar (Training, Nutrition, Mobility & Recovery, Daily Routine), for Check-ins, Logs, Activities and Adaptation, and for accounts/social/coach features? In particular:

- **Nutrition depth**: macro and hydration targets only, template meals, AI-suggested meals ("what to eat and drink today"), or food logging?
- **Sport coverage**: Vang wants any sport selectable with no hard-coded sport programs. Does "any sport" at launch mean free-text sport handled by AI, or a curated list of sport profiles the engine knows (with free text later)? If curated, the first-user decision fixes the launch list's core: padel, tennis, beach volleyball, kitesurfing, windsurfing, basketball, 5-a-side football.
- **Health-app connection**: Vang wants Stamina to connect with a health app (Apple Health / Google Health Connect) so Activities and workouts feed Adaptation and the app shows what to eat and drink. Per the platform research this needs a native shell (Capacitor) and the Apple Developer Program at $99/yr, which breaks the €0 constraint: is it in the 8-week MVP (read-only import of workouts?), or week-9+, with manual Activity logging at launch?

Output: an in/out table per Pillar that fits 8 weeks at ~15 h/week with AI agents.

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
