# Training generation model: periodization, progression, sport and Activity load

Type: grilling
Status: open
Blocked by: 01, 11, 12

## Question

What is the sport-agnostic model that turns a user's sport, goals, equipment, schedule and level into a Program and adapts it? No sport-specific program is hard-coded; Vang's `seed/` is one example user. Covers:

- how a sport is described to the engine (demands: energy systems, movement patterns, injury-prone areas, season phase, typical Activity load) and where that description comes from (curated profile vs AI, per the MVP scope decision);
- Block structure and periodization scheme, Session templates, exercise selection rules;
- progression rules (RPE/RIR targets, load/rep progression) and Deload rules;
- how Activities count toward weekly load, planned or not: e.g. a basketball player logs 2 games this week, or a kitesurfer gets 3 unplanned windy days, so the app suggests moving or lightening Sessions, or a Deload week;
- Adaptation triggers from Logs, Check-ins and Activities (missed Sessions, high RPE, poor sleep, soreness), and the rule that Adaptations are suggestions the user accepts or declines;
- the exercise library schema.
