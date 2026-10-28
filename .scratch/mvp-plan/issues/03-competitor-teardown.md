# Competitor teardown: Fitbod, MyFitnessPal, Future, padel apps

Type: research
Status: resolved

## Question

For Fitbod, MyFitnessPal, Future (and any padel-specific training apps, e.g. Playtomic's training features, Padel-specific coaching apps), what does each actually do across the four Pillars (Training, Nutrition, Mobility & Recovery, Daily Routine), how does it adapt to user feedback, what does it cost (current public pricing per region, trial terms), what platforms does it ship on, and what do users publicly complain about (App Store / Play reviews, Reddit)? Output a comparison table plus the gaps a padel-first, four-Pillar coach could own. Cite primary sources (official sites, store listings, pricing pages).

## Answer

Incumbents each own one Pillar (Fitbod Training, MFP Nutrition logging, Future human-coached Training, US-only); no daily readiness Check-in anywhere; padel apps are booking or tiny. Fitbod + MFP ≈ €40/mo in Greece.

Full findings: `docs/research/competitor-teardown.md` on branch `research/competitor-teardown` (commit `a6a9668`).

- **Every incumbent covers one Pillar well.** Fitbod covers Training, plus muscle-recovery modelling and warm-ups/cool-downs. MyFitnessPal covers Nutrition logging and meal planning. Future covers Training through a human coach and explicitly gives no meal plans or calorie or macro targets. None of them generates a Program that spans all four Pillars.
- **How each one adapts:**
  - **Fitbod** adapts from the sets, reps and weight you log, from per-muscle recovery estimates (0–100%, about 6–7 days to full recovery) and from the edits you make to its suggestions. It has no daily subjective readiness Check-in (sleep, soreness, RPE).
  - **Future** is adapted by a human coach each week from your workout history and messages.
  - **MyFitnessPal** adapts through goals and an "AI Coach" that gives insights. It does not adapt a training plan.
- **Price (App Store, current SKUs):**

  | App | US | Greece |
  |---|---|---|
  | Fitbod | $15.99/mo, $95.99/yr | €17.99/mo, €99.99/yr |
  | MyFitnessPal Premium | $19.99/mo, $79.99/yr | €21.99/mo, €87.99/yr |
  | MyFitnessPal Premium+ | $24.99/mo, $99.99/yr (official blog) | — |
  | Future | $50 first month, then $199/mo | Not available (US-only) |

  Fitbod has a 7-day opt-in trial that auto-renews. MyFitnessPal has a free tier and a "free Premium trial" whose length I could not verify.
- **Padel-specific competition is either thin or not about training.**
  - Playtomic, the dominant padel app, is for booking, matches, levels and club-run Academy lessons. Its paid plan removes fees and adds stats. It has no S&C (strength and conditioning), nutrition or recovery programming.
  - Two small padel S&C products exist:
    - **PadelCare** (iOS, 4 US ratings): free daily warm-up, workout and cool-down. PadelCare+ costs $9.99/mo or $99.99/yr and adds 4/6/8-week plans with simple progression (hit every set → step up).
    - **Core Padel** (web-only): program library. Pro costs €19.99/mo and includes an "AI Coach".
- **Most common public complaints:**
  - Billing or trial traps and charges after cancelling (Fitbod, Future).
  - Paywalled basics (barcode scanner) and UI churn (MyFitnessPal).
  - Generic or erratic programming that doesn't suit intermediates, plus no way to flag an injury (Fitbod).
  - Price and generic coaching (Future).
  - Level-rating and fee complaints (Playtomic).
- **Gaps a padel-first, four-Pillar coach could own:**
  - One Program that schedules S&C around matches and links Nutrition and Mobility & Recovery to it.
  - A real daily readiness Check-in that drives Adaptation.
  - Injury and soreness input.
  - EU availability.
  - Transparent trial and cancellation.
  - A price below Fitbod plus MyFitnessPal combined (about €38–40/month at Greek monthly prices).
