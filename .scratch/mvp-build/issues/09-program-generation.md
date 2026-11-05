# 09: Program generation with rules only, plus the reveal

**What to build:** After onboarding, the user sees their first week: Block 1 with its emphasis, Sessions placed around their sport days with complete slot structure, targets and loads, built entirely by rules (exercises chosen by a deterministic picker).

**Blocked by:** 06: Consent, Screening and outcomes, 07: Exercise library, 08: Sport Profiles and sport requests

**Status:** done

**Roadmap week:** 4

- [x] Block emphasis from Goal, Sport Profile and season; rolling 4-week Blocks (3 build + Deload) with RIR 3/2/1/4 and Deload half sets
- [x] Session structure: warm-up, main strength, sport support, accessories & core, cool-down, scaled to 30/45/60 (30 merges slots 3 and 4)
- [x] Weekly placement: no heavy Session for an area inside the recovery window before a hard Activity; none on hard-Activity days; ≥ 1 free day; heavy upper and lower on separate days
- [x] Rep ranges and RIR per emphasis; week-1 loads RPE-guided; Limited mode caps (RPE ≤ 7, no power/plyometric slot, no RIR 1) and area exclusions applied
- [x] Deterministic rules-only exercise picker from the library (the fallback the AI ticket reuses)
- [x] Every Session stores revision, rules_version and inputs hash
- [x] Reveal screen and week view render the Program; 'Suggested by AI' not shown yet
- [x] API tests with fixture users (seed persona padel Tue/Fri, basketball 2 games, kitesurfer 'varies', Limited user) assert placement and structure

## Notes

- Engine in `packages/domain` (`generateWeek`, `placeSessions`, `pickExercises`, `prescribe`, `chooseEmphasis`); API module `apps/api/src/program/`; migration `0006_program.sql`; `GET`/`POST /program`; web `features/program` (reveal at `/reveal`, week view at `/week`). Design and every beta number: `docs/development.md` "Program generation" and `packages/domain/src/config.ts`.
- Only **week 1 of Block 1** is generated and stored. Weeks 2 to 4 (RIR 2, 1, then the Deload at RIR 4 with half sets) exist in the engine and are tested by calling `generateWeek` directly, the one test that cannot go through the API seam until a later ticket generates the next week.
- Equipment is fixed at bodyweight + dumbbells until the profile gets an equipment answer (the reveal says so). That is why a Session for a person with an excluded area often cannot be filled with a heavy focus.
- Decisions Vang may veto: a heavy focus the library cannot fill becomes a **Recovery** Session on the same day (the Session count is kept; the week view says so); a Limited Session has **no sport-support slot** (nearly every sport-support exercise is a jump, bound or ballistic swing), its exercises move to accessories; a hard Activity recurs weekly, so the recovery window also looks at next week's play days.
- Known gaps: a knee, hip or lower-back exclusion turns most heavy Sessions into Recovery Sessions until the library grows; `hardActivityDates` counts only `Hard` play days, and 'It varies' has none.
