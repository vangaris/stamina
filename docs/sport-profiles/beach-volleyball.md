# Beach volleyball: Sport Profile review note

Data file: `apps/api/src/sports/data/beach-volleyball.json`. Status when seeded: draft; the founder approves it.

Basis types: **source** = stated by a cited source; **estimate** = our own number built from source statements; **heuristic** = rule of thumb, no source.

Sources: (1) Quantifying the Activity Profile of Female Beach Volleyball Tournament Match-Play, J Sports Sci Med 2021. (2) Physical performance and game demands in beach volleyball: A systematic review, J Hum Sport Exerc 2025. (3) 2024 Adult Compendium of Physical Activities.

| Field | Value | Basis |
| --- | --- | --- |
| Energy mix | aerobic 35, repeated-sprint 35, explosive 30 | **Estimate** from 1, 2: work-rest ratio about 1:5, about 219 jumps per match and 5.8 per point (as cited in 1), about 34% of match time above 80% of peak heart rate (cited in 1), sprinting and jumping on sand. The split is our estimate. |
| Key movements | jump-land, change-of-direction, overhead | **Source** 1, 2: jumps (block, spike), short accelerations and decelerations on sand, hitting overhead. The choice of labels is our **judgement**. |
| High-load areas | shoulder, lower-back, knee, ankle | **Estimate.** Derived from the movements (overhead to shoulder, jumping and landing to knee and ankle, trunk position to lower back). Not stated by a source; load emphasis only. |
| Typical activity | 60 min, moderate | **Source** 2 (Table 3): elite match about 42 min (two or three sets). **Heuristic**: recreational sessions are several games, our choice; the `moderate` label is also ours. |
| METs | easy 4.0, moderate 6.0, hard 8.0 | **Source** (3) for the values: 15710 volleyball 4.0, 15711 volleyball competitive in gymnasium 6.0, 15725 volleyball beach, in sand 8.0. Easy and moderate are indoor entries because no easier beach entry exists. 15725 (8.0) is a Compendium *estimated* value (shown in red in the Compendium), not one supported by published literature; the mapping of codes to effort levels is our **judgement**. |
| Recovery window | lower 48 h, upper 36 h | **Heuristic**, not a sourced fact: many jumps and landings on sand load the legs; overhead hitting loads the shoulders. |
| Season | weather, months 5-9 | **Heuristic** for outdoor sand courts in Greece/EU. Not sourced. |

## Uncertain, for founder review
- Energy mix percentages are an estimate.
- Easy and moderate METs are indoor volleyball codes, not beach codes; the hard value 15725 is a Compendium estimated value.
- Season months are not sourced.
- Source 1 covers elite women; recreational values are extrapolated.
- High-load areas are inferred from movements.
