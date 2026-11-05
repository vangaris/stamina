# Tennis: Sport Profile review note

Data file: `apps/api/src/sports/data/tennis.json`. Status when seeded: draft; the founder approves it.

Basis types: **source** = stated by a cited source; **estimate** = our own number built from source statements; **heuristic** = rule of thumb, no source.

Sources: (1) Intensity of tennis match play, Br J Sports Med 2006. (2) Smekal et al., "A physiological profile of tennis match play", Med Sci Sports Exerc 2001 (replaces "Applied physiology of tennis performance", whose abstract is framed around injury prevention). (3) 2024 Adult Compendium of Physical Activities.

| Field | Value | Basis |
| --- | --- | --- |
| Energy mix | aerobic 40, repeated-sprint 40, explosive 20 | **Estimate** from 1, 2: 1 gives 4-10 s bouts of high intensity, 10-20 s recovery (work:rest about 1:1 to 1:4), VO2max about 45-55 ml/kg/min, "intermittent"; 2 gives 50-min matches with rallies of 6.4 s, effective playing time 29.3%, average VO2 51.1% of VO2max and lactate about 2.1 mmol/l. Serves and sprints are short high-power actions. The split is our estimate. |
| Key movements | change-of-direction, rotation, overhead, grip | **Judgement** from 1, 2: sprints and direction changes, serves (overhead), groundstroke rotation, racket. Labels ours. |
| High-load areas | shoulder, elbow, lower-back, knee, ankle | **Estimate.** Derived from the movements (serve and overhead to shoulder and elbow, rotation to lower back, direction changes to knee and ankle). Not stated by a source; load emphasis only. |
| Typical activity | 60 min, moderate | **Source** for the length: 1 describes 60-minute simulated matches (2: 50-min matches). **Heuristic**: recreational length and the `moderate` label are our choice. |
| METs | easy 5.0, moderate 6.8, hard 8.0 | **Source** (Compendium 2024): 15695 hitting balls non-game play, moderate effort 5.0; 15675 general, moderate effort 6.8; 15690 singles 8.0 (also 15676 competitive 8.0). |
| Recovery window | lower 48 h, upper 36 h | **Heuristic**, not a sourced fact: repeated sprints and stops load the legs longer; serving and overhead loads the shoulders for a shorter window. |
| Season | weather, months 4-10 | **Heuristic** for outdoor courts in the Northern Hemisphere; Greek courts are playable most of the year. Not sourced. |

## Uncertain, for founder review
- Energy mix percentages are an estimate.
- Season months are an assumption; consider year-round if most players use covered or Mediterranean courts.
- High-load areas are inferred from movements, no source lists them.
- Source 1 and 2 are on competitive players; recreational values are extrapolated.
- 15695 (5.0) is a Compendium estimated value, not one supported by published literature.
