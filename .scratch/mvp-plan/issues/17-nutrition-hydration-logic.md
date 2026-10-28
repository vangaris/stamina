# Nutrition and hydration logic

Type: grilling
Status: resolved
Blocked by: 01, 12

## Question

Within the Nutrition depth chosen in MVP scope: how are energy and macro targets computed (BMR equation, activity factors, goal adjustments, protein per kg), how do they vary by Session, Activity and rest days, how are food preferences, diets and allergies captured and applied, how does the app show what to eat and drink each day, what are the hydration and electrolyte rules (sweat-rate heuristics, heat, game/match days), what recovery nutrition guidance is given, and what are the hard floors/ceilings (minimum intake, no extreme deficits)? Also: the **fixed meal templates** used when AI meal suggestions are off (Cloud setup's kill-switch fallback): how many, per which preferences/allergies, in household measures. Vang's `seed/nutrition-lifestyle-guide.md` is one example user, not the template.

## Comments

- 2026-10-28: Fact-finding: `docs/research/nutrition-evidence.md` on branch `research/nutrition-evidence` (commit `76b632e`). Gist: Mifflin-St Jeor (EFSA-accepted); EFSA PAL 1.4–2.0; 2024 Compendium METs per sport (padel, CrossFit, HYROX need stand-ins); no source converts session-RPE to kcal; deficit 250–500 kcal, < 1 %/week loss; no published hard kcal floor; IOC REDs warning signs; protein 1.2–2.0 (ISSN 1.4–2.0; ≥ 2.0 in deficit), 0.25–0.3 g/kg per meal; carbs 3–5 / 5–7 / 6–10 / 8–12 g/kg by load, 30–60 g/h during > 1 h; fat 20–35 % (not < 20 % long term); water AI 2.5 L men / 2.0 L women (~80 % from drinks), 0.4–0.8 L/h during, sodium for > 2 h or heavy/salty sweat, hyponatraemia from over-drinking; 14 EU allergens (Reg. 1169/2011 Annex II); Art. 7(3) bans disease claims for foods.
- 2026-10-28 rounds 1–2 (Vang accepted all recommendations Q1–Q16).

## Answer

Sources: `docs/research/nutrition-evidence.md` (branch `research/nutrition-evidence`). **[INFERENCE]** marks values the sources don't set.

**Inputs (onboarding)**
- **Sex for the energy equation**: female / male / prefer not to say.
- Birth year, height, weight.
- **Everyday activity**: mostly sitting / on my feet / physical job.
- **Eating pattern**: everything / pescatarian / vegetarian / vegan.
- **Allergies and intolerances** from the 14 EU Annex II allergens, plus dislikes.
- **Meals per day** (3–5) and **cooking effort** (quick / normal).
- Per Activity: a **"hot conditions"** toggle, pre-ticked for kitesurfing, windsurfing and beach volleyball in summer.

**Energy**
- **Resting energy**: Mifflin-St Jeor.
  - Men: 10·kg + 6.25·cm − 5·age + 5. Women: the same − 161.
  - Prefer not to say: midpoint, constant −78 **[INFERENCE]**.
- **Baseline**: resting energy × factor that excludes exercise: 1.4 mostly sitting / 1.5 on my feet / 1.7 physical job **[INFERENCE: avoids double counting]**.
- **Training energy** per Session or Activity: (MET − 1) × kg × hours, with 2024 Compendium METs. Easy / moderate / hard maps to the low / general / vigorous entries.
  - **MET values become a Sport Profile field Vang approves**; padel, CrossFit and HYROX use the research's stand-in entries.
  - Load (RPE × minutes) is never converted to kcal.
- **Day types**: rest / Session / Activity / hard Activity, each with its own target.
- **Goal adjustment**:
  - Fat loss: −400 kcal/day, never applied on hard-Activity days.
  - Muscle gain: +250 kcal/day **[INFERENCE]**.
  - Other Goals: maintenance.
  - **Rate check**: loss > 1 % of bodyweight per week for 2 weeks running halves the deficit, with a one-line reason.
- **Floor**: the target never goes below resting energy **[INFERENCE: no published athlete floor]**. The rate check firing twice in a row shows a "talk to a dietitian or doctor" prompt.
- Meals carries a static card with the IOC REDs warning signs. There is no symptom questionnaire (data minimisation); Safety rules may revisit.
- **Recalculation**: on a weight change ≥ 2 kg, or a Goal or schedule change. Adaptive targets are post-MVP 21.

**Macros**
- **Protein**: 1.6 g/kg/day, or 2.0 g/kg/day when losing fat. The same every day, about 0.3 g/kg per meal (20–40 g).

| Day type | Carbs (g/kg) |
|---|---|
| Rest | 3 |
| Session day | 4 |
| Activity day | 5 |
| Hard Activity day | 6–7 |

- **Before an Activity**: a snack of about 1 g/kg, 1–4 h before.
- **Activities over 90 min**: suggest 30–60 g carbs per hour during, as food or drink.
- **Fat**: at least 20 % of energy, filling the rest up to 35 %. If everything doesn't fit, carbs drop first on rest days.

**Hydration**
- **Baseline drinks**: 2.0 L men / 1.6 L women / 1.8 L prefer not to say. That is 80 % of EFSA total water; the rest comes from food.
- **+0.5 L per hour** of Session or Activity; **+0.25 L per hour when hot**.
- **Pre-Activity cue**: 5–10 ml/kg in the 2–4 h before.
- **Electrolyte note** for Activities over 2 h, or hot with heavy or salty sweat (no brands, no doses).
- **Cap**: never more than 1 L per hour of exercise, with "drink to thirst, don't force it" (hyponatraemia guard).

**Meals**
- **Rules set each slot's target**: protein grams, carb portion, timing relative to the Session or Activity.
- **AI writes a meal idea** in household measures with a **full ingredient list**, honouring eating pattern and dislikes.
- **Allergens are a deterministic check**: an ingredient→allergen table rejects any hit; after 2 failed regenerations, a fixed template is used.
- **No supplement advice**: no creatine, magnesium, protein-powder doses, vitamins or hormone content. The only exception is the electrolyte-drink note.

**Fixed templates**: ~60 (4 eating patterns × 5 slots × 3 options), each tagged with the 14 allergens and in household measures. Selected by pattern and allergens, portions scaled to the slot. Used by the AI kill switch and the allergen fallback. Reviewed by the dietitian before launch.

**Copy rules**: never claim a food prevents, treats or cures anything (Reg. 1169/2011 Art. 7(3)). Never name conditions; no hormone, weight or detox promises. Present targets as general sports-nutrition guidance for healthy adults, with a pointer to a dietitian for an individual plan.

**Propagated**
- Generation engine: meal-idea contract and allergen check.
- Safety rules: REDs card, no symptom questionnaire.
- Find the professional reviewers: the dietitian brief.
- Data model additions (profile fields above, Activity `hot` flag, Sport Profile METs) fold into the schema at spec time.
- Post-MVP 20 (weather feed) and 21 (adaptive energy targets).
- 2026-10-28 (from Greek localisation): the ingredient→allergen table becomes a ~300-item ingredient vocabulary (ID, EN/EL names, 14-allergen tags, household units); AI meal ideas reference ingredient IDs only.
