# Training generation model: periodization, progression, sport and Activity load

Type: grilling
Status: resolved
Blocked by: 01, 11, 12

## Question

What is the sport-agnostic model that turns a user's sport, goals, equipment, schedule and level into a Program and adapts it? No sport-specific program is hard-coded; Vang's `seed/` is one example user. Covers:

- how a sport is described to the engine (demands: energy systems, movement patterns, injury-prone areas, season phase, typical Activity load): per MVP scope, every sport profile (the 11 launch sports and user requests) is AI-drafted from a fixed schema and approved by Vang before it is shared; this ticket fixes that schema, the sources the draft must cite, and Vang's review checklist;
- Block structure and periodization scheme, Session templates, exercise selection rules;
- progression rules (RPE/RIR targets, load/rep progression) and Deload rules;
- how Activities count toward weekly load, planned or not: e.g. a basketball player logs 2 games this week, or a kitesurfer gets 3 unplanned windy days, so the app suggests moving or lightening Sessions, or a Deload week;
- Adaptation triggers from Logs, Check-ins and Activities (missed Sessions, high RPE, poor sleep, soreness), and the rule that Adaptations are suggestions the user accepts or declines;
- the exercise library schema.

## Comments

- 2026-10-28 round 1 (Vang accepted all recommendations):
  - Q1 Sport profile (AI-drafted with cited sources, Vang-approved; checklist: every field filled, sources cited, no medical claims). Fields: energy mix (aerobic / repeated-sprint / explosive %); key movement patterns (change of direction, jump-land, rotation, overhead, grip, push, pull, hinge, carry, board stance); high-load body areas (steer Session emphasis; copy never claims injury prevention); typical Activity (duration, intensity); recovery window (hours after a hard Activity before a heavy lower- or upper-body Session); season (league or weather).
  - Q2 Load = session-RPE (RPE × minutes, Foster) for Sessions and Activities; weekly load compared with the user's own 4-week average; no ACWR, no risk claims.
  - Q3 Rolling 4-week Blocks: 3 build weeks + 1 Deload week; one emphasis per Block (Strength / Power & speed / Strength-endurance) from goal, sport profile and season.
  - Q4 Session template, 5 slots scaled to 30/45/60 min: warm-up (5–8 min, sport movement prep) → main strength (2–3 compound lifts) → sport support (power, plyos, rotation, change of direction per profile) → accessories & core (high-load areas) → cool-down (3–5 min mobility). At 30 min, slots 3 and 4 merge.
  - Q5 Library: free-exercise-db data (public domain); wger images unmodified with attribution where available (free-exercise-db images not used); curated ~150 exercises; Stamina tags: equipment, location (gym / home / court / beach), movement pattern, high-load areas, slot, RIR-suitable, easier/harder variant.
  - Q6 AI picks exercises from the library only, per slot (sport profile, equipment, recent soreness, variety) and explains; rules set sets, reps, RIR and load; AI never invents exercises or numbers.
  - Q7 No 1RM testing: week-1 RPE-guided load ("could do 2–3 more"), learned from Logs; home users progress by reps, tempo, harder variants.
  - Q8 One primary goal: perform better in my sport / get stronger / general fitness / body composition.
- 2026-10-28 round 2 (Vang accepted all recommendations): Q9 progression, Q10 Deload triggers, Q11 weekly placement, Q12 unplanned Activity, Q13 Check-in effect, Q14 missed Sessions, Q15 volume flex, Q16 rule-sourced explanations, all as recorded in the Answer.

## Answer

All thresholds are **beta starting values**, tuned from real Logs after launch.

**Inputs**
- **Goal** (one): perform better in my sport / get stronger / general fitness / body composition.
- **Sport Profile** (per sport; AI-drafted with cited sources, approved by Vang before it is shared): energy mix; key movement patterns; high-load body areas; typical Activity; recovery window; season. Vang's review checklist: every field filled, sources cited, no medical claims.
- Equipment, location, available days, Sessions per week and duration (30/45/60 min), level (intermediate design target).

**Structure**
- Rolling 4-week Blocks: 3 build weeks + 1 Deload week. One emphasis per Block (Strength / Power & speed / Strength-endurance), chosen from Goal, Sport Profile and season.
- Session = 5 slots scaled to duration: warm-up (5–8 min) → main strength (2–3 compound lifts) → sport support → accessories & core (high-load areas) → cool-down (3–5 min). At 30 min, slots 3 and 4 merge.

**Who decides what**
- **AI** fills slots with exercises **from the library only** (Sport Profile, equipment, recent soreness, variety) and may rephrase explanations.
- **Rules** set sets, reps, RIR targets, load, placement and every Adaptation trigger. AI never invents an exercise or a number.

**Load**: session-RPE (RPE × minutes) for Sessions and Activities. Weekly load is compared with the user's own 4-week average (no ACWR, no risk claims).

**Progression**

| Emphasis | Reps | RIR |
|---|---|---|
| Strength | 4–6 | 2 |
| Power & speed | 3–5 fast | ≥ 3, stop when speed drops |
| Strength-endurance | 10–15 | 2 |

- Week in Block: W1 RIR 3 → W2 RIR 2 → W3 RIR 1 → Deload at RIR 4 with sets × 0.5.
- All sets at the top of the range at or below target → next Session +2.5 kg upper / +5 kg lower (or the harder variant at home).
- Two sets logged ≥ target RPE + 2 → −5% load.
- Missed reps → hold.
- Week-1 loads are RPE-guided ("could do 2–3 more"); no 1RM testing.

**Deload**: scheduled every 4th week. An early Deload is *suggested* when any of these holds:
- weekly load > 1.3 × the 4-week average for 2 weeks;
- 3 poor Check-ins in 5 days;
- 2 consecutive Sessions logged ≥ target RPE + 2.

If declined, the suggestion re-asks after 3 days while the trigger holds.

**Weekly placement** (in order):
1. No heavy Session for a body area inside the Sport Profile's recovery window before a planned hard Activity.
2. No Session on a hard-Activity day; if it is the only day available, it becomes an upper-body or recovery Session.
3. ≥ 1 day/week with no Session and no planned hard Activity.
4. Heavy lower- and upper-body work on different days where possible.

**Volume flex**: the user's Session count is kept. Sets scale so that weekly load (Sessions + planned Activities) stays within +10% of the 4-week average in build weeks.

**Adaptation triggers → suggestions** (user accepts or declines; nothing auto-applies):
- **Unplanned Activity** inside the next Session's recovery window → first option that fits: move the Session ±1 day, then swap to upper-body/recovery, then lighten by 1 set per exercise.
- **Check-in** (sleep, soreness, energy, each 1–5): 2 of 3 ≤ 2 → lighter version (RIR +1, −1 set) or a recovery Session. Soreness ≤ 2 in a targeted area → swap those exercises. A good Check-in **never** raises load.
- **Missed Sessions**: 1 → skip, never stack; ≥ 2 in a week → repeat that week's targets; ≥ 2 weeks off → restart the Block at W1 with RIR +1.

**Explanations**: every Adaptation carries a one-line reason generated from the triggering rule and the user's numbers, e.g. "You played 2 hard padel matches (load 1,150 vs your usual 700) — Thursday's legs moved to Friday". AI may rephrase; it may not invent reasons.

**Exercise library**: free-exercise-db data (public domain); wger images unmodified with attribution where available (free-exercise-db images not used); curated ~150 exercises. Tags per exercise: equipment, location (gym / home / court / beach), movement pattern, high-load areas, slot, RIR-suitable, easier and harder variant.

**Propagated**
- Generation engine: the AI/rules split and rule-sourced explanations are now inputs.
- Data model: new entities (Sport Profile, tagged exercises, Activity load, Adaptation with rule and reason).
- `GLOSSARY.md`: Goal, Sport Profile, Load.
