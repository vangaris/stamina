# Screening and red-flag sources: PAR-Q+ licensing, ACSM screening

Type: research
Status: resolved

## Question

What validated pre-participation screening instruments can Stamina use in onboarding, and under what licence: PAR-Q+ (2023+ version, ePARmed-X+), the original PAR-Q, the ACSM pre-participation health screening algorithm (Riebe et al. 2015 and later ACSM Guidelines editions), and any others? What are the published red-flag symptoms that should stop exercise and prompt seeing a doctor (chest pain, syncope, etc.), and what does each source say about pregnancy, under-18s, and known cardiovascular/metabolic/renal disease? Output: candidate instrument + licence terms + the red-flag list with citations.

## Answer

PAR-Q+ and CSEP GAQ need written (possibly paid) licences for in-app use; ACSM algorithm logic and red-flag list are public, so own-worded screening is possible but can't claim 'validated'. Red flags converge across sources.

Full findings: `docs/research/screening-sources.md` on branch `research/screening-sources` (commit `dc9f899`).

- **The PAR-Q+ (current edition "2025", form dated 01-11-2024) cannot go into a commercial app without permission.** The PAR-Q+ Collaboration's terms require *prior written authorization* before the PAR-Q+ or ePARmed-X+ is incorporated into "mobile applications, websites, commercial software, automated screening systems". The terms also reserve the right to charge fees for commercial and electronic use. Free use covers only unmodified forms for "individual, clinical, educational, and non-commercial research purposes". The official online version is a UBC-hosted Qualtrics survey, which Stamina could link to. No Greek version exists yet; the Collaboration lists Greek as "underway". [S1–S4]
- **The original PAR-Q (CSEP, revised 2002) is retired.** It covered ages 15–69 only and said "No changes permitted… photocopy… only if you use the entire form". CSEP says its Get Active Questionnaire (GAQ, 2017) "replaces previous tools". [S5, S7]
- **The CSEP GAQ, its Pregnancy version (GAQ-P) and its Reference Document are free to reproduce if unmodified and complete.** Selling them or putting them in software needs CSEP's written permission and a licence fee. Reproducing them "in computer software" requires a CSEP Licensing Agreement. The GAQ-P already exists in Greek. [S6–S9]
- **The ACSM pre-participation algorithm (Riebe et al. 2015) is copyrighted text and figures.** The journal is paywalled, and reuse goes through Wolters Kluwer / Copyright Clearance Center. The algorithm's logic is public: (1) is the person currently exercising, (2) do they have known cardiovascular, metabolic or renal disease, or signs and symptoms of it, (3) what intensity do they want. The ACSM 12th edition (2025) changelog lists no change to the screening chapter beyond a new title and an incident-report figure. [S10–S14]
- **The Australian APSS (ESSA, AUSactive and SMA) is a free 6-question Stage-1 form for adults**, with a separate version for ages 5–17 (PSS-YP). The form does not state any licence terms (**UNVERIFIED**). The companion eBook is "All rights reserved". [S15–S18]
- **The red-flag symptoms are the same across sources:** chest, neck, jaw or arm pain or discomfort; fainting, dizziness or loss of consciousness; breathlessness at rest or with mild effort; palpitations; ankle swelling; leg pain when walking (claudication); unusual fatigue; poorly controlled diabetes or low blood sugar; blood pressure ≥160/90; recent concussion. Pregnancy adds vaginal bleeding, leaking fluid, regular painful contractions, calf pain or swelling, headache and muscle weakness. [S1, S7, S9, S11, S15, S19–S21]
- **[INFERENCE] Trade-off:** shipping PAR-Q+ or GAQ text inside the app needs a written licence from a third party, which may cost money and has no guaranteed turnaround. Copyright covers how a text is worded, not the ideas behind it (WIPO Copyright Treaty art. 2 [S22]). So writing Stamina's own questions from the published criteria avoids the licence, but it gives up the "validated instrument" claim. Both licensors forbid presenting modified versions as official. Get legal advice before relying on this.
