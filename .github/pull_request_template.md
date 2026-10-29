Closes #

## What and why

<!-- One or two sentences. Link the ticket in .scratch/mvp-build/issues/ if there is one. -->

## Test evidence

<!-- What you ran and saw: test names, the Playwright run, a screenshot or recording for UI. -->

## Migration notes

<!-- New or changed Drizzle migration? Say what it does and that it is forward-only. Otherwise: none. -->

## Stamina checklist

- [ ] No health data in logs, error reports, analytics or AI prompts
- [ ] Copy follows the never-advise list and the food-claim rules (wellness wording only)
- [ ] EN and EL strings added for every new string
- [ ] Semantic tokens only, no raw colours or sizes
- [ ] Numbers, schedules and safety outcomes come from domain rules, not the AI

## Safety-critical paths

<!-- Touching Screening or stop-flag rules, copy files, AI prompts or validators, or migrations?
Vang must leave an explicit sign-off note on this PR before merge (CODEOWNERS enforces review). -->

- [ ] Does not touch safety-critical paths, **or** sign-off note from Vang is on this PR
