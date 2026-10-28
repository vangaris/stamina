# 09: Program generation with rules only, plus the reveal

**What to build:** After onboarding, the user sees their first week: Block 1 with its emphasis, Sessions placed around their sport days with complete slot structure, targets and loads, built entirely by rules (exercises chosen by a deterministic picker).

**Blocked by:** 06: Consent, Screening and outcomes, 07: Exercise library, 08: Sport Profiles and sport requests

**Status:** ready-for-agent

**Roadmap week:** 4

- [ ] Block emphasis from Goal, Sport Profile and season; rolling 4-week Blocks (3 build + Deload) with RIR 3/2/1/4 and Deload half sets
- [ ] Session structure: warm-up, main strength, sport support, accessories & core, cool-down, scaled to 30/45/60 (30 merges slots 3 and 4)
- [ ] Weekly placement: no heavy Session for an area inside the recovery window before a hard Activity; none on hard-Activity days; ≥ 1 free day; heavy upper and lower on separate days
- [ ] Rep ranges and RIR per emphasis; week-1 loads RPE-guided; Limited mode caps (RPE ≤ 7, no power/plyometric slot, no RIR 1) and area exclusions applied
- [ ] Deterministic rules-only exercise picker from the library (the fallback the AI ticket reuses)
- [ ] Every Session stores revision, rules_version and inputs hash
- [ ] Reveal screen and week view render the Program; 'Suggested by AI' not shown yet
- [ ] API tests with fixture users (seed persona padel Tue/Fri, basketball 2 games, kitesurfer 'varies', Limited user) assert placement and structure
