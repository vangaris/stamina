# Professional review brief

For: Find the professional reviewers (`../issues/26-find-reviewers.md`). Launch gate from Safety rules: **no real users before both sign-offs.**

## What Stamina is (for the reviewer)

A mobile app for adult (18+) intermediate amateur athletes in Greece: padel, tennis, beach volleyball, kitesurfing, windsurfing, basketball, 5-a-side football, running, CrossFit, HYROX, calisthenics. It plans strength and conditioning Sessions around the user's sport, adapts them to what they actually played and how they feel, and suggests daily food and hydration targets with meal ideas.

It is a **general wellness product, not a medical device**: no diagnosis, no rehab, no condition-specific plans, no supplement advice. Users with symptoms or known conditions are referred to a professional. Free invite-only beta of ~30 users from week 8, 100 by week 12.

## Who we need

| Reviewer | Qualification | Nice to have | Where to look |
|---|---|---|---|
| **Physio / physician** | Licensed physiotherapist (ΠΣΦ member) or sports-medicine physician | ΠΣΦ "Αθλητικός Φυσικοθεραπευτής – Ειδικός Άσκησης" (SPT) certification; works with amateur racket or team sport athletes | Vang's network (padel clubs, gyms, teams); ΠΣΦ directory "Βρες Φυσικοθεραπευτή" (https://www.psf.org.gr/) |
| **Dietitian** | Licensed dietitian-nutritionist (άδεια ασκήσεως επαγγέλματος, Περιφέρεια) | ΠΣΔΔ member; sports-nutrition experience | Vang's network; ΠΣΔΔ "Find a dietician" (https://www.hda.gr/diaitologos/) |

## Scope: what each reviewer checks

### Physio / physician: Safety rules (`../issues/16-safety-rules.md`)

1. **Screening**: the 10 yes/no questions (own wording, or licensed PAR-Q+/GAQ text if permission arrives) and the starting-level question. Are any red flags missing? Is any wording unclear to a layperson, in English and Greek?
2. **Outcome table**: Referred / area excluded / Nutrition off / cleared, and the **Limited** first Block after "A doctor has said I can train" (RPE ≤ 7, no power or plyometric slot, no RIR 1 weeks). Is any outcome too lax or too strict?
3. **Stop flags and copy**: chest pain or pressure, fainting or dizziness, unusual breathlessness, racing or irregular heartbeat → stop, "call 112 if severe", training paused until a doctor has seen them. Fever → rest. New pain or swelling → area excluded. Head knock → paused. Is the wording safe, and does it avoid naming conditions?
4. **Training rules** (`../issues/15-training-generation-model.md`):
   - progression;
   - Deload triggers;
   - "never harder after a good Check-in";
   - body-area exclusion only, never rehab;
   - load from sport Activities (RPE × minutes vs 4-week average).

   Anything unsafe for an intermediate amateur?
5. **Never-advise list and disclaimers** (5 placements).

### Dietitian: Nutrition and hydration logic (`../issues/17-nutrition-hydration-logic.md`)

1. **Energy**: Mifflin-St Jeor × non-exercise factor (1.4 / 1.5 / 1.7) + (MET − 1) × kg × hours per Session or Activity. The "prefer not to say" midpoint. Fat loss −400 kcal (never on hard Activity days), muscle gain +250 kcal. Rate check: > 1 %/week for 2 weeks halves the deficit. **Floor**: never below resting energy.
2. **Macros**: protein 1.6 g/kg (2.0 when losing fat), ~0.3 g/kg per meal. Carbs 3 / 4 / 5 / 6–7 g/kg by day type; pre-Activity ~1 g/kg; 30–60 g/h for Activities > 90 min. Fat ≥ 20 %.
3. **Hydration**: drinks 2.0 / 1.6 / 1.8 L + 0.5 L/h (+0.25 L/h hot), pre-Activity 5–10 ml/kg, electrolyte note for > 2 h or hot/salty sweat, cap of 1 L/h of exercise with "drink to thirst".
4. **Safety**: the "talk to a dietitian or doctor" prompt, the IOC REDs warning-signs card, eating-disorder screening → Nutrition off, no supplement advice.
5. **Meals copy rules** (no prevent/treat/cure claims; general guidance for healthy adults).
6. **Second pass (build week ~5)**: the ~60 fixed meal templates with allergen tags (14 EU allergens), the ingredient→allergen table, and 20 sampled AI meal ideas.

Values marked **[INFERENCE]** in the nutrition ticket have no published source and need the dietitian's explicit judgement.

## What we ask back

- Comments or redlines on each item above (a shared doc or annotated PDF).
- A short **sign-off statement**: "I reviewed [items] as general guidance for healthy adults on [date]; required changes: […] / none".
- Optional: willingness to be listed as a reviewer on the website (only with written consent).

**Not asked**: assessing individual users, ongoing clinical responsibility, or endorsing the product in marketing.

## Effort, timing, terms

- **Effort** [INFERENCE]: physio ~3–4 h; dietitian ~3 h for the rules + ~3 h for the templates pass.
- **Timeline**: first contact by **build week 2**; rules review back by **week 5**; template pass in **week 6**; fixes in **week 7**; launch week 8.
- **Fee**: **[Vang] decides**: a paid review (the first professional-services cost), an advisor arrangement, or lifetime free access. Unpaid reviews tend to slip; the launch date depends on this one.
- **Confidentiality**: materials are shared in confidence; no user data is involved.

---

## Outreach message: physio (Greek)

> Γεια σας, είμαι ο [Όνομα], frontend developer στην Αθήνα. Φτιάχνω μια εφαρμογή προπόνησης και διατροφής για ερασιτέχνες αθλητές (padel, beach volley, kite, μπάσκετ κ.ά.). Δεν είναι ιατρικό προϊόν: δεν κάνει διάγνωση ούτε αποκατάσταση, και παραπέμπει σε επαγγελματία όποιον έχει συμπτώματα. Πριν τη δώσουμε σε ~30 χρήστες, θέλω έναν φυσικοθεραπευτή να ελέγξει τις ερωτήσεις υγείας, τα «σήματα διακοπής» και τους κανόνες προπόνησης (περίπου 3–4 ώρες). Θα σας ενδιέφερε; Μπορώ να στείλω ένα σύντομο έγγραφο και να συζητήσουμε την αμοιβή. Ευχαριστώ, [Όνομα], [τηλέφωνο]

## Outreach message: dietitian (Greek)

> Γεια σας, είμαι ο [Όνομα], frontend developer στην Αθήνα. Φτιάχνω μια εφαρμογή που προτείνει ημερήσιους στόχους ενέργειας, μακροθρεπτικών και ενυδάτωσης, και ιδέες γευμάτων, για υγιείς ενήλικες ερασιτέχνες αθλητές. Δεν δίνει εξατομικευμένα διαιτολόγια ούτε συμβουλές για παθήσεις ή συμπληρώματα. Πριν την beta (~30 χρήστες), θέλω έναν διαιτολόγο-διατροφολόγο να ελέγξει τους κανόνες (περίπου 3 ώρες) και αργότερα ~60 πρότυπα γεύματα με αλλεργιογόνα (περίπου 3 ώρες). Θα σας ενδιέφερε; Μπορώ να στείλω ένα σύντομο έγγραφο και να συζητήσουμε την αμοιβή. Ευχαριστώ, [Όνομα], [τηλέφωνο]

## Outreach message (English, either reviewer)

> Hi, I'm [Name], a developer in Athens building a training and nutrition app for adult amateur athletes (padel, beach volleyball, kite, basketball…). It's a general wellness app: no diagnosis, no rehab, no condition-specific advice, and it refers anyone with symptoms to a professional. Before ~30 beta users try it, I'd like a [physiotherapist / dietitian] to review [the health questions, stop signals and training rules / the energy, macro and hydration rules and ~60 meal templates], about [3–4 / 6] hours. Would you be interested? I can send a short brief and we can discuss a fee. Thanks, [Name], [phone]
