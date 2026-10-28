# 07: Exercise library

**What to build:** The engine has a curated, licensed, bilingual exercise library to choose from: about 150 exercises with Stamina tags, images where licensed, and attribution.

**Blocked by:** 01: Walking skeleton

**Status:** ready-for-agent

**Roadmap week:** 3–4

- [ ] ~150 exercises imported from free-exercise-db (public domain) with EN name and instructions
- [ ] Images only from wger, unmodified, with per-image attribution stored and shown; no free-exercise-db images
- [ ] Every exercise has tags: equipment, location (gym / home / court / beach), movement pattern, high-load body areas, Session slot, RIR-suitable, easier and harder variant
- [ ] Tags drafted by agents and reviewed by Vang (review recorded in the PR)
- [ ] EN/EL name and instruction fields exist (EL may be filled in the localisation ticket)
- [ ] API query returns exercises filtered by equipment, location, slot and excluded areas; API tests prove an excluded area never appears
