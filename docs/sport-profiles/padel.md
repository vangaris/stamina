# Padel: Sport Profile review note

Data file: `apps/api/src/sports/data/padel.json`. Status when seeded: draft; the founder approves it.

Basis types: **source** = stated by a cited source; **estimate** = our own number built from source statements; **heuristic** = rule of thumb, no source.

Sources: (1) Padel vs. tennis doubles, Frontiers in Sports and Active Living 2025. (2) Performance Analysis in Padel: A Systematic Review, J Hum Kinet 2023. (3) Padel Match Analysis, Italian sub-elite competitions, 2022. (4) 2024 Adult Compendium of Physical Activities.

| Field | Value | Basis |
| --- | --- | --- |
| Energy mix | aerobic 50, repeated-sprint 35, explosive 15 | **Estimate** from 1, 3: walls lengthen rallies; "largely oxidative with occasional glycolytic", lower alactic share than tennis doubles; heart rate 70-80% of max, lactate about 2.6 mmol/L (cited in 1). 3 measured sub-elite matches: rally 6.7 s, recovery 14.8 s, work-to-rest about 1:3.4, match 53.7 min, effective playing time 31.3%. The about-13 s rally and 0.84 work-to-rest ratio quoted in 3 are an elite figure and are not used for sub-elite players. The split itself is our estimate. |
| Key movements | change-of-direction, rotation, overhead, grip | **Source** 2, 3: frequent direction changes; volleys, smashes and bandeja (overhead) are the common strokes; racket sport. The choice of labels is our **judgement**. |
| High-load areas | shoulder, lower-back, knee, ankle | **Estimate.** Derived from the movements above (overhead to shoulder, rotation to lower back, direction changes to knee and ankle). Not stated by a source; load emphasis only. |
| Typical activity | 60 min, moderate | **Heuristic** for the length: 60 min, below the 53.7 min sub-elite match of 3 plus warm-up and breaks, and well below the about 90 min of professional matches in 2. The Frontiers study (1) used 40-min matches. **Source** for the intensity: heart-rate range in 1; the `moderate` label is our reading. |
| METs | easy 4.5, moderate 6.0, hard 6.8 | **Source** (4) for the values, **judgement** for the mapping. The Compendium has no padel entry. Proxy: tennis codes 15685 and 15680, which are both "Tennis, doubles" (4.5 and 6.0), so they are one activity at two Compendium values, not two effort levels; 15675 is "general, moderate effort" (6.8), which is why 6.8 is `hard` only by choice. Singles 8.0 deliberately not used (source 1 reports lower external load than tennis). |
| Recovery window | lower 36 h, upper 36 h | **Heuristic**, not a sourced fact: hard padel is intermittent, moderate-to-high load, no heavy eccentric component; midpoint of the 24-72 h range. |
| Season | year-round, no months | **Heuristic**: indoor and covered courts are common in Greece/EU. Not sourced. |

## Uncertain, for founder review
- Energy mix percentages are an estimate, not a measured split.
- METs are a tennis-doubles proxy; no padel Compendium code exists. Hard 6.8 is a judgement.
- Recreational duration (60 min) and year-round season are not directly sourced.
- High-load areas are inferred from movements, no source lists them.
