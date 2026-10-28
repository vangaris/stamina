# Onboarding flow, including screening

Type: prototype
Status: claimed
Blocked by: 12, 16

## Question

How should onboarding look and behave on a phone: the opening question of what the user needs (training program, nutrition, or both), sport (11 launch sports + request), its schedule (e.g. games per week), Goal, level, equipment, location, Nutrition inputs (sex for the energy equation, everyday activity, eating pattern, 14 EU allergens + dislikes, meals per day, cooking effort), units/locale, the safety disclaimer acceptance, GDPR explicit consent for health data, Screening per Safety rules (nine yes/no questions with "if unsure, answer yes", the starting-level question, body-area picker) with its outcome screens (Referred, Limited after "a doctor has said I can train", area excluded, Nutrition off), and the first suggested Program reveal? Rough clickable prototype on the Core screens tokens; measures: steps, time to first Program, drop-off risks.

## Comments

- 2026-10-28: Prototype built: branch `prototype/onboarding` (commit `cb2445d`), `prototypes/onboarding/index.html`, checked out at `~/code/stamina-prototype-onboarding`. Variants: A Stepper (one question per screen), B Sections (hub with 4 section forms), C Fast start (minimum to first Program; equipment, body stats + food, account asked later as "finish setup" cards). Same fields and Safety-rules outcome logic in all three. Smoke-tested in headless Chromium, 18 scripted paths (happy, area excluded, referred → "a doctor has said I can train" → Limited, under-18, eating disorder → Nutrition off, training-only) × 3 variants, no console errors. Screens to Program reveal: A 23–26, B 8–11 (incl. hub visits), C 7–8. Findings: (1) birth year must be the first personal question so under-18s never see consent or health questions (fixed in all variants); (2) Safety rules Q9 must be split into 9a (supervised exercise → Referred) and 9b (eating disorder → Nutrition off), because one combined question can't drive two outcomes. Awaiting Vang's verdict.
