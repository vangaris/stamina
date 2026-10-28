# Core screens: Today, Session, Meals, Progress

Type: prototype
Status: claimed
Blocked by: 12, 15

## Question

How should the four core screens look and behave mobile-first: Today (what to do now across Pillars, what to eat and drink, Check-in prompt, quick "I played" Activity log, pending Adaptation suggestions to accept or decline), Session (exercise flow, set logging with RPE/RIR, rest timer, swaps), Meals (targets and AI meal suggestions, one-tap meal Log, hydration), Progress (adherence, load trends including Activities, Adaptations explained)? Rough, platform-neutral prototype (the delivery platform is decided afterwards) plus design-system basics as tokens (type scale, colour, spacing, core components) that any framework can adopt.

## Comments

- 2026-10-28: Prototype built: branch `prototype/core-screens` (commit `ee0390f`), file `prototypes/core-screens/index.html`; checked out at `~/code/stamina-prototype-core-screens`. Single framework-free HTML file, double-click to open; `?variant=A|B|C` or ←/→ / bottom bar; "{ } state" shows live state; "reset" restarts. Variants: A Timeline (day as an ordered list, bottom tabs), B Next up (one focus at a time: one-question Check-in, one-exercise Session, next-meal hero, narrative week; top segments), C Dashboard (rings and tiles, FAB for "I played", suggestions behind a bell, Session as a set table). Shared: :root design tokens (type scale, spacing, radius, light/dark colour). Rules wired in-memory (from Training generation model): low Check-in → lighter-version suggestion; soreness → recovery swap; hard unplanned Activity → move ±1 day, else swap to recovery, with the rule-sourced reason; water +500 ml on hard-Activity days. Smoke-tested in headless Chromium: all 12 screens render, no console errors, every flow above exercised in each variant. Awaiting Vang's verdict.
