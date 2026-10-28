# Generation engine: rules vs LLM vs hybrid; cost and safety controls

Type: grilling
Status: claimed
Blocked by: 05, 09, 15, 16

## Question

Vang wants AI to suggest Sessions (and meals, per the Nutrition depth). Training generation model already fixes the split for Training: AI only picks exercises from the library per Session slot and may rephrase rule-generated explanations; rules set sets, reps, RIR, load, placement and Adaptation triggers. Data model already fixes storage: every generated Session records `rules_version`, `model`, `prompt_version` and an inputs hash; an LLM_CALL ledger records purpose, model, tokens and cost per pseudonymous user. Cloud setup fixes cost guardrails: the provider **must** offer a hard monthly cap or prepaid credit; per-user daily caps come from the ledger; a global daily kill switch falls back to rule-built Sessions and fixed meal templates. Given that, how is the LLM's output constrained and validated (library IDs only, schema, safety rules), where else may it act (drafting Sport Profiles for Vang's approval, meal suggestions), which provider and what health data (if any) may leave the backend to it, what are the per-user cap values, and how is the engine tested so Adaptations are reproducible?

## Comments

- 2026-10-28 (from Nutrition and hydration logic): meal-idea contract for the engine. Rules set each slot's target (protein g, carb portion, timing). The LLM returns a meal idea in household measures **with a full ingredient list**. A deterministic ingredient→allergen table rejects any allergen hit, with up to 2 regenerations, then a fixed template. No supplements, doses or conditions in LLM output. Fixed templates (~60) back the kill switch.
- 2026-10-28 (from Safety rules): the engine must enforce the never-advise list in rules **and** in checks on LLM output; apply Limited-mode caps (RPE ≤ 7, no power/plyometric slot, no RIR 1 weeks) and body-area exclusions; honour stop-flag pauses; and never send Screening answers, stop flags or clearance statements to the LLM provider.
