# Nutrition and hydration logic

Type: grilling
Status: claimed
Blocked by: 01, 12

## Question

Within the Nutrition depth chosen in MVP scope: how are energy and macro targets computed (BMR equation, activity factors, goal adjustments, protein per kg), how do they vary by Session, Activity and rest days, how are food preferences, diets and allergies captured and applied, how does the app show what to eat and drink each day, what are the hydration and electrolyte rules (sweat-rate heuristics, heat, game/match days), what recovery nutrition guidance is given, and what are the hard floors/ceilings (minimum intake, no extreme deficits)? Also: the **fixed meal templates** used when AI meal suggestions are off (Cloud setup's kill-switch fallback): how many, per which preferences/allergies, in household measures. Vang's `seed/nutrition-lifestyle-guide.md` is one example user, not the template.

## Comments

- 2026-10-28: Fact-finding: `docs/research/nutrition-evidence.md` on branch `research/nutrition-evidence` (commit `76b632e`). Gist: Mifflin-St Jeor (EFSA-accepted); EFSA PAL 1.4–2.0; 2024 Compendium METs per sport (padel, CrossFit, HYROX need stand-ins); no source converts session-RPE to kcal; deficit 250–500 kcal, < 1 %/week loss; no published hard kcal floor; IOC REDs warning signs; protein 1.2–2.0 (ISSN 1.4–2.0; ≥ 2.0 in deficit), 0.25–0.3 g/kg per meal; carbs 3–5 / 5–7 / 6–10 / 8–12 g/kg by load, 30–60 g/h during > 1 h; fat 20–35 % (not < 20 % long term); water AI 2.5 L men / 2.0 L women (~80 % from drinks), 0.4–0.8 L/h during, sodium for > 2 h or heavy/salty sweat, hyponatraemia from over-drinking; 14 EU allergens (Reg. 1169/2011 Annex II); Art. 7(3) bans disease claims for foods.
