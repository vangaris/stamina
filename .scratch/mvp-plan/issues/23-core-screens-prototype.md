# Core screens: Today, Session, Meals, Progress

Type: prototype
Status: resolved
Blocked by: 12, 15

## Question

How should the four core screens look and behave mobile-first: Today (what to do now across Pillars, what to eat and drink, Check-in prompt, quick "I played" Activity log, pending Adaptation suggestions to accept or decline), Session (exercise flow, set logging with RPE/RIR, rest timer, swaps), Meals (targets and AI meal suggestions, one-tap meal Log, hydration), Progress (adherence, load trends including Activities, Adaptations explained)? Rough, platform-neutral prototype (the delivery platform is decided afterwards) plus design-system basics as tokens (type scale, colour, spacing, core components) that any framework can adopt.

## Comments

- 2026-10-28: Prototype built: branch `prototype/core-screens` (commit `ee0390f`), file `prototypes/core-screens/index.html`; checked out at `~/code/stamina-prototype-core-screens`. Single framework-free HTML file, double-click to open; `?variant=A|B|C` or ←/→ / bottom bar; "{ } state" shows live state; "reset" restarts. Variants: A Timeline (day as an ordered list, bottom tabs), B Next up (one focus at a time: one-question Check-in, one-exercise Session, next-meal hero, narrative week; top segments), C Dashboard (rings and tiles, FAB for "I played", suggestions behind a bell, Session as a set table). Shared: :root design tokens (type scale, spacing, radius, light/dark colour). Rules wired in-memory (from Training generation model): low Check-in → lighter-version suggestion; soreness → recovery swap; hard unplanned Activity → move ±1 day, else swap to recovery, with the rule-sourced reason; water +500 ml on hard-Activity days. Smoke-tested in headless Chromium: all 12 screens render, no console errors, every flow above exercised in each variant. Awaiting Vang's verdict.
- 2026-10-28 verdict (Vang): Q1–Q6 accepted as recommended. Q7 changed: the design must be **themeable**, so the prototype's `:root` values are a placeholder theme that the real brand theme replaces later. Admin panel: no prototype needed; the MVP has no admin UI (MVP scope: Vang approves sports in the DB table editor; review-queue screen is post-MVP 18).

## Answer

Prototype (primary source): branch `prototype/core-screens`, commit `ee0390f`, `prototypes/core-screens/index.html`.

**Screens**

| Screen | Chosen design |
|---|---|
| **Today** | Variant A timeline: the day as one time-ordered list (meals, Session, Activities, hydration, 22:30 wind-down). Header shows date and a Load pill ("Load X · usual Y"). Pending Adaptation suggestions sit **inline at the top**, each with title, change, rule-sourced "Why", Accept / Keep my plan. The daily Check-in uses Variant B's **one question per screen** (sleep → soreness → energy, 1–5 with end labels). A full-width ＋ "I played" button is always reachable (sport, duration, effort; shows the computed Load) |
| **Session** | Variant B focus mode: **one exercise per screen**, slot label and position ("Main strength · 1/5"), target line (sets × reps · RIR or "fast, stop when speed drops"), set dots, large weight and reps steppers, RPE 6–10 chips, large "Done · set N". **Full-screen rest timer** with skip. Variant C's set table is available as an **overview toggle**. Finishing asks for session RPE 1–10 |
| **Meals** | Variant B **next-meal card** first (meal, AI idea in household measures, ~protein, preferences line; "I ate this" / "Something else" / "Skipped"; "↻ another idea"). Below it: Variant A targets (energy, protein, water with +250 / +500 ml; target +500 ml after a hard Activity) and the full day list |
| **Progress** | Variant A: Sessions done/planned, logged vs planned Activities, weekly Load bars (4 past weeks + this week, done solid and planned dashed) against the dashed 4-week average, and the week day by day. On top: Variant B's one-sentence verdict (e.g. "heavier than usual: watch for Deload suggestions"). Check-in trends and Adaptation history stay post-MVP 17 |
| **Navigation** | Bottom tab bar with labels: Today · Session · Meals · Progress. No bell or hidden inbox for suggestions |

**Theming (design system base)**
- **Two token tiers.** Primitive tokens hold raw values: palette, font families, sizes. Semantic tokens hold roles: `bg`, `surface`, `surface-2`, `text`, `muted`, `border`, `accent`, `accent-ink`, `accent-soft`, `load`, `load-soft`, `suggest` / `warn`, `ok`, `shadow`, plus type scale, spacing, radius and tap size.
- **Components reference semantic tokens only**, never raw values.
- **A theme is one mapping from semantic to primitive tokens.** Light and dark are two themes, picked from the OS setting. The brand theme (name, palette, type, logo) replaces the placeholder later without touching components.
- **Placeholder theme values** (from the prototype):
  - system font;
  - type 12/14/16/20/24/32/48;
  - spacing 4/8/12/16/24/32;
  - radius 8/16/pill;
  - 44 px minimum tap target;
  - green accent, blue Load, amber suggestions.
- **Token format and build** (framework-neutral token source → CSS variables / native theme objects) is decided with the delivery platform.

**Propagated**: Delivery platform and frontend architecture must implement the theme layer. The "Design system specifics" fog now names the brand theme as the remaining piece.
