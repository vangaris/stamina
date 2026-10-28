# Onboarding flow, including screening

Type: prototype
Status: resolved
Blocked by: 12, 16

## Question

How should onboarding look and behave on a phone: the opening question of what the user needs (training program, nutrition, or both), sport (11 launch sports + request), its schedule (e.g. games per week), Goal, level, equipment, location, Nutrition inputs (sex for the energy equation, everyday activity, eating pattern, 14 EU allergens + dislikes, meals per day, cooking effort), units/locale, the safety disclaimer acceptance, GDPR explicit consent for health data, Screening per Safety rules (nine yes/no questions with "if unsure, answer yes", the starting-level question, body-area picker) with its outcome screens (Referred, Limited after "a doctor has said I can train", area excluded, Nutrition off), and the first suggested Program reveal? Rough clickable prototype on the Core screens tokens; measures: steps, time to first Program, drop-off risks.

## Comments

- 2026-10-28: Prototype built: branch `prototype/onboarding` (commit `cb2445d`), `prototypes/onboarding/index.html`, checked out at `~/code/stamina-prototype-onboarding`. Variants: A Stepper (one question per screen), B Sections (hub with 4 section forms), C Fast start (minimum to first Program; equipment, body stats + food, account asked later as "finish setup" cards). Same fields and Safety-rules outcome logic in all three. Smoke-tested in headless Chromium, 18 scripted paths (happy, area excluded, referred → "a doctor has said I can train" → Limited, under-18, eating disorder → Nutrition off, training-only) × 3 variants, no console errors. Screens to Program reveal: A 23–26, B 8–11 (incl. hub visits), C 7–8. Findings: (1) birth year must be the first personal question so under-18s never see consent or health questions (fixed in all variants); (2) Safety rules Q9 must be split into 9a (supervised exercise → Referred) and 9b (eating disorder → Nutrition off), because one combined question can't drive two outcomes. Awaiting Vang's verdict.
- 2026-10-28 verdict (Vang): Q1–Q6 accepted as recommended.

## Answer

Prototype (primary source): branch `prototype/onboarding`, commit `cb2445d`, `prototypes/onboarding/index.html`.

**Structure: Variant C "Fast start", 8–9 screens to the first Program**

| # | Screen |
|---|---|
| 1 | What do you want from Stamina (training / what to eat & drink / both) + **birth year**. Under 18 → "Stamina is for adults", nothing saved, **before any consent or health question** |
| 2 | Sport (11 launch sports + "Other…" with "we'll review it") + when you play (days, or "It varies" for weather/pickup) + usual duration + intensity; hot-conditions default noted for kite / windsurf / beach volleyball |
| 3 | Goal (Body composition hidden if 9b = yes) |
| 4 | Training week (if training): Sessions per week, length, available days |
| 5 | Disclaimer acceptance + explicit health-data consent (unticked; EU storage, encrypted, never sent to the AI provider, export / withdraw / delete anytime) |
| 6 | Starting-level question + **all 10 Screening questions on one page**, each with "If unsure, answer yes" |
| 6a | (if 6 = yes) body-area picker |
| 7 | Save your plan: account via email code or Google, one tap |
| 8 | Reveal: Block 1 emphasis, the week around sport days, "Suggested by AI" label, today's food targets or "Meals unlock…" |

**Outcome screens**
- **Referred**: "Let's check with a professional first", no diagnosis; answers saved privately with export/delete; "A doctor has said I can train" → Limited first Block. Pregnancy: "your doctor or midwife", no Limited path.
- **Area excluded**: note on the reveal.
- **Nutrition off**: note on the reveal.

**Finish setup cards (after the reveal)**
- **Equipment**: until answered, Sessions assume bodyweight + dumbbells, and the card says so.
- **Unlock Meals**: height, weight, sex for the energy equation, everyday activity, eating pattern, 14 EU allergens, dislikes, meals per day, cooking effort. Meals stay locked until it is complete.
- **Reminder permission**: asked after the first Check-in, not during onboarding.

**Propagated**: Safety rules Q9 split into 9a / 9b (now 10 questions); birth year is the first personal question.
- 2026-10-28 (from Legal review): screen 1 also asks **country of residence**; only EU/EEA residents can continue during the beta ("Stamina is available in the EU/EEA for now"), before any consent or health question.
