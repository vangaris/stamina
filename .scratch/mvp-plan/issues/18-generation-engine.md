# Generation engine: rules vs LLM vs hybrid; cost and safety controls

Type: grilling
Status: resolved
Blocked by: 05, 09, 15, 16

## Question

Vang wants AI to suggest Sessions (and meals, per the Nutrition depth). Training generation model already fixes the split for Training: AI only picks exercises from the library per Session slot and may rephrase rule-generated explanations; rules set sets, reps, RIR, load, placement and Adaptation triggers. Data model already fixes storage: every generated Session records `rules_version`, `model`, `prompt_version` and an inputs hash; an LLM_CALL ledger records purpose, model, tokens and cost per pseudonymous user. Cloud setup fixes cost guardrails: the provider **must** offer a hard monthly cap or prepaid credit; per-user daily caps come from the ledger; a global daily kill switch falls back to rule-built Sessions and fixed meal templates. Given that, how is the LLM's output constrained and validated (library IDs only, schema, safety rules), where else may it act (drafting Sport Profiles for Vang's approval, meal suggestions), which provider and what health data (if any) may leave the backend to it, what are the per-user cap values, and how is the engine tested so Adaptations are reproducible?

## Comments

- 2026-10-28 (from Nutrition and hydration logic): meal-idea contract for the engine. Rules set each slot's target (protein g, carb portion, timing). The LLM returns a meal idea in household measures **with a full ingredient list**. A deterministic ingredient→allergen table rejects any allergen hit, with up to 2 regenerations, then a fixed template. No supplements, doses or conditions in LLM output. Fixed templates (~60) back the kill switch.
- 2026-10-28 (from Safety rules): the engine must enforce the never-advise list in rules **and** in checks on LLM output; apply Limited-mode caps (RPE ≤ 7, no power/plyometric slot, no RIR 1 weeks) and body-area exclusions; honour stop-flag pauses; and never send Screening answers, stop flags or clearance statements to the LLM provider.
- 2026-10-28 round 1 (Vang accepted all recommendations Q1–Q7).

## Answer

Hybrid engine: **rules decide everything numeric and everything safety-related; the LLM only fills constrained gaps**. Provider facts are from the LLM-options research; **[INFERENCE]** marks estimates.

**What the LLM does (MVP)**

| Job | Input | Output |
|---|---|---|
| Fill Session slots (once per user per week) | slot spec + candidate exercise IDs **pre-filtered by rules** (equipment, location, excluded areas, Limited mode, recent repeats) | exercise IDs from the candidates + one-line pick reason |
| Meal ideas (per day, on first open, cached; regenerated only if the day type changes) | slot targets (protein g, carb portion, timing), eating pattern, unlabelled "avoid" ingredient list (allergens ∪ dislikes), cooking effort | meal name, ingredients with household portions, protein estimate |
| Draft Sport Profiles (admin script on Vang's machine, not in-app) | Sport Profile schema + sport name | draft for Vang's approval with sources Vang verifies |

- Adaptation explanations are **fixed EN/EL templates** filled from rule data; the LLM never rephrases them.
- Adaptations themselves are rule-only (move / lighten / swap to recovery): **no LLM call**.

**No health data to the provider**
- Prompts contain only sport, Goal, equipment, slot targets, candidate and recent exercise IDs, eating pattern, cooking effort, and the unlabelled avoid list.
- Prompts never contain: user ID, name, email, age, sex, weight, Check-ins, Screening, stop flags or clearance statements.
- The LLM_CALL ledger links calls to users on our side only. [INFERENCE] This fits provider DPAs that list special-category data as "None"; the DPIA confirms it.

**Output validation (nothing trusted)**
- **Sessions**: strict schema; every ID in the candidate list; right count per slot; no duplicates.
  - Failure → 1 retry → deterministic rules-only picker (highest-ranked tagged candidates).
- **Meals**: strict schema; ingredient→allergen table; EN/EL never-advise text filter (supplement names, condition terms, cure/treat/detox, dose patterns such as mg/IU); protein estimate within ±30 % of the slot target.
  - Failure → up to 2 regenerations → fixed template.
- Every result is stored with `model`, `prompt_version`, inputs hash and validator outcomes.

**Provider**
- **Primary: Anthropic Claude Haiku 5.5**, at $0.10 / $0.50 per M tokens (in/out).
  - Hard monthly spend cap.
  - Schema-guaranteed JSON outputs.
  - No training on API data.
  - Inference `global`/`us` only: pseudonymous non-health data leaves the EU under the Anthropic DPA with SCCs.
- **Fallback: OpenAI gpt-5-nano**: project spend limits, strict schemas.
- **If the DPIA requires EU-only processing: Mistral EU endpoint** (1.1×).
- **Risk**: Anthropic AUP from 2026-11-12 requires a human in the loop for "Medical" (diagnosis, treatment plans, interpreting symptoms). The Q1–Q3 scope stays outside it; the physio's sign-off reviews the scope.

**Cost and caps**
- Estimate [INFERENCE]: 100 users ≈ 3,400 calls/month ≈ 7M input + 2M output tokens ≈ **$2/month**.
- Anthropic hard cap **$10/month**.
- Per user: **15 calls/day**; "↻ another idea" **3/day**, then templates.
- **Global kill switch at 80 % of the monthly cap** → rules-only Sessions + fixed meal templates.
- **First paid threshold**: Anthropic has no free tier, so **AI is Stamina's first real cost from the first beta user** (≈ $2/month, hard-capped at $10).

**Testing and reproducibility**
- Rules engine (Load, progression, Deload, placement, Adaptations, nutrition targets, safety outcomes): pure functions with golden tests on fixture users: Vang's seed persona, a basketball player, a kitesurfer, a Limited-mode user, a vegan with a nut allergy.
- LLM layer behind one interface. Any `prompt_version` change must pass a 50-prompt evaluation set through the validators at **≥ 98 %** before deploy. Low temperature.
- Adaptations are deterministic. LLM picks are reproduced from their **stored output**, never by re-calling the provider.

**Transparency**
- "Suggested by AI" label on meal ideas and exercise picks (EU AI Act Art. 50).
- The privacy notice names Anthropic as processor and what is sent.
- The DPIA covers the LLM flow.
