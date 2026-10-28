# Training generation model: periodization, progression, sport and Activity load

Type: grilling
Status: claimed
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
