# Find the professional reviewers

Type: task
Status: resolved
Blocked by: 16, 17

## Question

Find and agree terms with a licensed sports physician or physiotherapist and a registered dietitian to review the safety rules and nutrition logic before real users see them. HITL: Vang contacts candidates (e.g. via his padel network in Athens); the agent prepares a review brief from the safety-rules and nutrition-logic tickets. The physician/physio's scope: screening questions, the outcome table, stop flags and their copy, the never-advise list and the disclaimers. The dietitian's scope: the energy/macro/hydration rules, the ~60 fixed meal templates with allergen tags, the ingredient→allergen table, and the Meals copy rules. Both sign-offs gate launch to real users. Answer records who, cost, turnaround, and the week the review lands.

## Comments

- 2026-10-28: Review brief + outreach messages (EL/EN) ready: [reviewer-brief.md](../assets/reviewer-brief.md). Directories verified: ΠΣΦ (psf.org.gr, "Βρες Φυσικοθεραπευτή", SPT sports-physio certification) and ΠΣΔΔ (hda.gr, "Find a dietician"); dietitians need an άδεια ασκήσεως επαγγέλματος from the Περιφέρεια. Timeline: contact by build week 2, rules review by week 5, template pass week 6, fixes week 7. Open [Vang] decision: fee (paid review vs advisor vs free access). Waiting on Vang to contact candidates.
- 2026-10-28 (Vang): Q1 paid fixed-fee review, quote per reviewer. Q2: this ticket closes with the plan; the actual booking is an [External] roadmap item.

## Answer

**Plan**: [reviewer-brief.md](../assets/reviewer-brief.md) (scope, checklists, deliverables, outreach messages EL/EN).

| | Physio / physician | Dietitian |
|---|---|---|
| Qualification | Licensed physiotherapist (ΠΣΦ), ideally SPT sports-physio certified, or sports-medicine physician | Licensed dietitian-nutritionist (άδεια ασκήσεως επαγγέλματος, Περιφέρεια), ideally ΠΣΔΔ member with sports-nutrition experience |
| Source | Vang's network, then ΠΣΦ "Βρες Φυσικοθεραπευτή" | Vang's network, then ΠΣΔΔ "Find a dietician" |
| Scope | Safety rules (screening, outcomes, Limited mode, stop flags + copy, never-advise list, disclaimers) + Training generation model safety aspects | Nutrition and hydration logic (energy, macros, hydration, floors, REDs prompt/card, copy rules); second pass on ~60 templates, allergen table and 20 sampled AI meals |
| Effort [INFERENCE] | ~3–4 h | ~3 h + ~3 h |
| Deliverable | Comments + dated sign-off statement | Comments + dated sign-off statement (two passes) |

- **Fee**: paid fixed fee, quote requested from each candidate. This is the first professional-services cost; amount unknown until quoted.
- **Timeline (build weeks)**:
  - contact by week 2;
  - rules reviews back by week 5;
  - template pass in week 6;
  - fixes in week 7;
  - launch in week 8.
- **Launch gate**: no real users before both sign-offs.
- **Roadmap**: "Book physio + dietitian reviewers" is an **[External]** item with the dates above. **[Vang]** sends the outreach.
