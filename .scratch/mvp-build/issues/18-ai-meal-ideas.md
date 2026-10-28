# 18: AI meal ideas

**What to build:** Nutrition users get AI meal ideas in their own language that fit their slot targets, eating pattern and dislikes, can never contain their allergens, and fall back to templates when anything is off.

**Blocked by:** 10: AI exercise picks, 17: Ingredient list, meal templates and meal log

**Status:** ready-for-agent

**Roadmap week:** 6

- [ ] Prompt contains slot targets, eating pattern, cooking effort and an unlabelled avoid list; no health data or identifiers
- [ ] AI returns ingredient IDs with household portions, a protein estimate and text in the user's locale
- [ ] Validators: schema; every ingredient ID exists; allergen check by ID; EN/EL never-advise term filter (supplements, conditions, cure/treat/detox, dose patterns); protein within ±30 % of target
- [ ] Failure → up to 2 regenerations → template
- [ ] Generated per day on first open and cached; regenerated only when the day type changes; 'another idea' up to 3 per day, then templates; per-user and global caps apply
- [ ] 'Suggested by AI' label; evaluation set gains EN and EL meal cases
- [ ] API tests (fake provider returning an allergen, a supplement mention and an off-target protein) prove each is rejected and the fallback served
