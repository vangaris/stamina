# Generation engine: rules vs LLM vs hybrid; cost and safety controls

Type: grilling
Status: open
Blocked by: 05, 09, 15, 16

## Question

Vang wants AI to suggest Sessions (and meals, per the Nutrition depth). Training generation model already fixes the split for Training: AI only picks exercises from the library per Session slot and may rephrase rule-generated explanations; rules set sets, reps, RIR, load, placement and Adaptation triggers. Given that, how is the LLM's output constrained and validated (library IDs only, schema, safety rules), where else may it act (drafting Sport Profiles for Vang's approval, meal suggestions), what health data (if any) may leave the backend to an LLM provider, how is per-user LLM cost capped, and how is the engine tested and versioned so Adaptations are reproducible?
