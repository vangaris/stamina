# Generation engine: rules vs LLM vs hybrid; cost and safety controls

Type: grilling
Status: open
Blocked by: 05, 09, 15, 16

## Question

Vang wants AI to suggest Sessions (and meals, per the Nutrition depth). Training generation model already fixes the split for Training: AI only picks exercises from the library per Session slot and may rephrase rule-generated explanations; rules set sets, reps, RIR, load, placement and Adaptation triggers. Data model already fixes storage: every generated Session records `rules_version`, `model`, `prompt_version` and an inputs hash; an LLM_CALL ledger records purpose, model, tokens and cost per pseudonymous user. Given that, how is the LLM's output constrained and validated (library IDs only, schema, safety rules), where else may it act (drafting Sport Profiles for Vang's approval, meal suggestions), which provider and what health data (if any) may leave the backend to it, how is per-user LLM cost capped using the ledger, and how is the engine tested so Adaptations are reproducible?
