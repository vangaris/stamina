# 17: Ingredient list, meal templates and meal log

**What to build:** Meals work without AI: a bilingual ingredient list with allergen tags drives about 60 fixed templates chosen by eating pattern and allergens and scaled to each slot's targets, shown on a next-meal card the user logs in one tap.

**Blocked by:** 16: Nutrition targets and water

**Status:** ready-for-agent

**Roadmap week:** 6

- [ ] ~300 ingredients with ID, EN/EL names, 14-allergen tags and household units
- [ ] ~60 templates (4 eating patterns × 5 slots × 3 options) tagged by pattern and allergens
- [ ] Template selection excludes every template containing an allergen the user listed; portions scaled to the slot's protein and carb targets
- [ ] Next-meal card first, then targets and the day list; ate it / something else / skipped in one tap
- [ ] API tests prove a tree-nut-allergic vegan never receives a template containing tree nuts or animal products
