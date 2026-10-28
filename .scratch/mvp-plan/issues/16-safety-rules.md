# Safety rules: screening, contraindications, red flags, never-advise list

Type: grilling
Status: resolved
Blocked by: 04, 10, 12

## Question

What exactly does Stamina screen at onboarding and on each Check-in, which answers block generation or modify a Program (contraindications), which reported symptoms trigger a stop-and-see-a-doctor message, what the app must never advise (diagnosis, rehab, medication, supplements, extreme deficits, etc.), the disclaimer text and placement, and how it handles minors, pregnancy and post-injury users? Guided by the medical-device and screening research; to be reviewed by the professional reviewers. Inputs from Nutrition and hydration logic: no supplement advice (electrolyte-drink note only); kcal target never below resting energy; a "talk to a dietitian or doctor" prompt when the weight-loss rate check fires twice; a static IOC REDs warning-signs card with no symptom questionnaire (revisit here if screening should ask more).

## Comments

- 2026-10-28 (Vang): unblocked from Ask PAR-Q+ Collaboration and CSEP for in-app licence terms. This ticket decides both branches; the licence outcome only picks the question wording (licensed PAR-Q+/GAQ text vs Stamina's own wording from public ACSM logic). Outcome logic, red flags, never-advise list and disclaimers are decided here regardless.
- 2026-10-28 round 1 (Vang accepted all recommendations Q1–Q8).

## Answer

Sources: medical-device boundary research and screening research. Principle: a safety feature stays wellness only if it **blocks, limits or refers**, names no condition, computes no risk score, and never issues clearance.

**Screening (onboarding, after consent; again every 12 months and on "My health has changed")**
- **Wording branch**: licensed PAR-Q+ / CSEP GAQ text if Ask PAR-Q+ Collaboration and CSEP for in-app licence terms yields usable permission; otherwise Stamina's own nine questions below, written from the public ACSM screening logic and red-flag lists, never called "PAR-Q+" or "validated". The outcome logic is identical either way.
- Every question carries "If unsure, answer yes".

| # | Question (own wording) |
|---|---|
| 1 | Has a doctor ever told you that you have a heart condition, have had a stroke, or have high blood pressure? |
| 2 | In the last 12 months, have you had chest pain, pressure or discomfort, at rest or during activity? |
| 3 | In the last 12 months, have you fainted, lost consciousness, or lost your balance because of dizziness? |
| 4 | Do you have diabetes (type 1 or 2) or kidney disease? |
| 5 | Do you get short of breath at rest or with light effort, or did you need medical care for asthma in the last 12 months? |
| 6 | Do you have a bone, joint or muscle problem that activity could make worse? (→ pick body areas) |
| 7 | Have you had a concussion or head injury in the last 12 months? |
| 8 | Are you pregnant? |
| 9a | Has a doctor told you to exercise only under medical supervision? |
| 9b | Are you being treated for an eating disorder? |

Plus a non-medical starting-level question: "Have you trained at least 3 × 30 min a week for the last 3 months?" Under-18s are blocked earlier, by birth year.

**Outcomes**

| Answer | Outcome |
|---|---|
| Yes to 1, 2, 3, 4, 5, 7, 8 or 9a | **Referred**: no Program; "Please talk to a doctor before starting" (pregnancy: "your doctor or midwife", and no Limited path) |
| Yes to 9b | Nutrition off; "body composition" Goal unavailable; Training continues |
| Yes to 6 | **Area excluded**: exercises loading the chosen areas are left out, with "get professional advice before training this area"; never a rehab or return plan; the user can remove the exclusion later |
| All no | Cleared to start; intensity builds from the starting level |

- **Returning after a referral**: the user states "A doctor has said I can train". That unlocks a **Limited** first Block: RPE ≤ 7, no power/plyometric slot, no RIR 1 weeks. Stamina records the statement and never issues clearance.

**Stop flags (in use)**
- **Where**: an "Anything unusual today?" row in the daily Check-in, and a **Stop** button on every Session screen.

| Flag | Action |
|---|---|
| Chest pain or pressure · fainting or dizziness · unusual breathlessness · racing or irregular heartbeat | Session stopped. "Stop training. If symptoms are severe or don't settle, call 112 now" (emergency number per locale). Training paused until the user confirms a doctor has seen them |
| Fever or feeling ill | Today becomes rest; no training while the fever lasts |
| New pain or swelling | Area excluded + "get it checked by a professional" |
| Head knock | Training paused until the user confirms a doctor has cleared them |

- Copy never names a condition or interprets a symptom.
- Any stop flag makes the user answer the relevant screening questions again.

**Never advise** (enforced in rules and in AI-output checks)
- diagnosis or what a symptom means;
- rehab, return-to-play, "fix your knee" plans;
- medication or supplements, and their doses;
- exercise or diets for a named condition;
- injury-risk scores or "prevents injury" claims;
- hormone, testosterone or detox content;
- training through pain;
- intake below resting energy, fasting protocols, weight-loss promises;
- anything for under-18s or pregnant users.

Mobility is framed as "general mobility", never pain relief.

**Disclaimers**
1. Onboarding, before screening, must be accepted: "Stamina gives general fitness and nutrition guidance for healthy adults. It is not a medical device and doesn't diagnose, treat or replace advice from a doctor, physiotherapist or dietitian. Stop and seek medical help if you feel unwell."
2. First Session of each Block: a one-line reminder plus the Stop button.
3. Meals footer: "General sports-nutrition guidance. For an individual plan, see a registered dietitian."
4. Settings → Safety: full text, the IOC REDs warning-signs card, and emergency numbers.
5. Store page and website: the same wording.

**Safety data**
- Screening answers are field-encrypted.
- Outcome, stop-flag events and clearance statements are stored to enforce pauses and Limited mode, retained like the account.
- Never sent to the LLM provider; never in analytics.

**Launch gate**: the sports physician/physio signs off screening questions, outcome table, stop flags and copy, the never-advise list and the disclaimers; the dietitian signs off the Nutrition parts. No real users before both sign-offs (owned by Find the professional reviewers).

**Propagated**
- Onboarding flow: screening, outcomes, Referred/Limited screens.
- Generation engine: never-advise output checks, Limited caps, area exclusions, no safety data to the LLM.
- Find the professional reviewers: physio scope and launch gate.
- Core screens additions (Check-in "Anything unusual today?" row, Session Stop button) fold in at spec time.
- `GLOSSARY.md`: Screening, Stop flag.
- 2026-10-28 (from Onboarding flow prototype, accepted by Vang): question 9 split into 9a (supervised exercise → Referred) and 9b (eating disorder → Nutrition off), because one combined question can't drive two outcomes. Screening is now 10 yes/no questions. Birth year is asked before consent and Screening, so under-18s never see health questions.
