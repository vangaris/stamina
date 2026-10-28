# How do the exercise library and app copy get into Greek?

Type: grilling
Status: resolved

## Question

EN + EL ship from day one (Notes), but the decided content sources are mostly English: free-exercise-db (EN only; ~150 curated exercises), wger (48 EL translations), the 11 Sport Profiles, ~60 meal templates, Safety-rules copy (screening, stop flags, disclaimers), fixed Adaptation-reason templates, and UI strings.

Who translates what, and how is it checked? Options include AI translation + Vang review, a professional translator for safety-critical copy only, or the reviewers checking the Greek of their scope. Also: does the AI write meal ideas directly in Greek for EL users, and how do the never-advise and allergen validators work in Greek? Output: a per-content-type translation and QA plan with hours, cost, and needed-by week.

## Comments

- 2026-10-28 round 1 (Vang accepted all recommendations Q1–Q6).

## Answer

**Who translates what (no professional translator in the MVP)**

| Content | How it becomes Greek | Checked by |
|---|---|---|
| UI strings (~500), Adaptation-reason templates, exercise library (~150; wger's 48 EL translations used where they match), Sport Profile user-facing text (11), meal templates (~60), ingredient vocabulary (~300) | AI translation from EN | Vang (native speaker) |
| Safety copy: Screening, outcomes, stop flags, disclaimers, REDs card | Vang writes EN + EL together | Physio and dietitian check the Greek within their review scope |
| Privacy notice, consent wording, terms of use | Vang drafts EN + EL | Lawyer reviews the Greek version |

**Rules**
- EN is the source language; every message key must exist in EL; **CI fails on a missing EL key**.
- ICU messages with Greek plural rules.
- **Style guide** (one page):
  - informal «εσύ»;
  - sentence case;
  - common gym terms keep the English name in brackets on first use, e.g. «Κάθισμα (squat)»;
  - metric units;
  - Greek number format (1.234,5).
- **Ingredient vocabulary**: ~300 ingredients with ID, EN/EL names, 14-allergen tags and household units.
  - The LLM returns **ingredient IDs**, never free-text ingredients.
  - The allergen check runs on IDs, so it is language-independent.
  - Display names follow the user's locale.
- **LLM output language**: meal names and descriptions, and exercise-pick reasons, are generated directly in the user's locale.
  - The never-advise filter has an EL term list (e.g. συμπλήρωμα, κρεατίνη, θεραπεία, αποτοξίνωση, διάγνωση, dose patterns such as mg / IU).
  - The eval set becomes 25 EN + 25 EL prompts.
- **Legal documents**: Greek is the authoritative version for the beta. Consent text is stored per version in both languages.

**Timing and effort** [INFERENCE]

| Item | Due | Hours |
|---|---|---|
| Safety + legal copy EN/EL (for reviewer and lawyer checks in weeks 5–6) | Build week 4 | ~2 h |
| UI strings (~500) | Build week 6 | ~3 h |
| Exercises (~150) | Build week 6 | ~3 h |
| Meal templates + ingredient vocabulary | Build week 6 | ~3 h |
| Style guide + CI missing-key check | Build week 6 | ~1 h |
| **Total** | | **≈ 12 h** |

**Budget impact**: the MVP estimate rises from ≈ 139 h to ≈ 151 h against ≈ 144 h available. The 8-week roadmap ticket must close the ≈ 7 h gap.

**Propagated**
- Nutrition and hydration logic + Generation engine: the meal-idea contract now uses ingredient IDs from the vocabulary.
- 8-week roadmap: the localisation hours and the budget gap.
