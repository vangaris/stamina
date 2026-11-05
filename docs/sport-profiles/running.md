# Running: profile review note

Data file: `apps/api/src/sports/data/running.json`. Status when seeded: draft. Sources opened 2026-11-03.

Sources: [1] Compendium of Physical Activities, Running page (pacompendium.com/running). [2] Gastin 2001, "Energy system interaction and relative contribution during maximal exercise" (PubMed 11547894).

Basis types: **source** = stated by a cited source; **estimate** = my own number built from source statements; **heuristic** = rule of thumb, no source.

| Field | Value | Basis |
|---|---|---|
| energyMix | aerobic 95 / repeatedSprint 3 / explosive 2 | **Estimate** from [2] Table I: aerobic share of 92% at 816 s and 96% at 1687 s for endurance-trained runners (from a mathematical model). A recreational run of 30 minutes or more is at least that aerobic, plus a small allowance for surges and the start. The split is my estimate. |
| keyMovements | jump-land, hinge | **Judgement.** The nearest values of the fixed SportMovement enum, which has no running-specific pattern: single-leg landing each step (jump-land) and hip extension (hinge, an approximation). No cited source supports `hinge`. |
| highLoadAreas | knee, ankle, hip | **Judgement.** Repeated single-leg impact loads the lower limb joints; no cited source measures it. Phrased as load only. |
| typicalActivity | 40 min, moderate | **Heuristic** for a recreational run. No source gives a recreational duration. |
| recoveryWindowHours | lower 48, upper 24 | **Heuristic.** A hard run loads the legs, so 48 h (middle of 24-72 h) before a heavy lower-body Session. Upper body is barely loaded, so 24 h. |
| season | weather, months 3, 4, 5, 6, 9, 10, 11 | **Heuristic.** Mild months in Greece and the EU, avoiding the hottest summer and coldest winter weeks. Not sourced. |
| metsPerIntensity | easy 6.5 / moderate 9.3 / hard 11.8 | **Source** [1]: 12028 running 4-4.2 mph (13 min/mile) = 6.5; 12050 running 6-6.3 mph (10 min/mile) = 9.3; 12080 running 7.5 mph (8 min/mile) = 11.8. |

## Uncertain, for founder review
- The energy mix split is my estimate; [2] is a model for endurance-trained runners.
- keyMovements are approximations because of the fixed SportMovement list; `hinge` in particular is not supported by a source.
- High-load areas are judgement; the earlier biomechanics paper was dropped because its framing was orthopaedic and it studied 5 m/s running.
- Typical duration, recovery window and season months are heuristics with no source.
- Recovery needs more thought for long runs; 48 h is a midpoint.
