# Five-a-side football: profile review note

Data file: `apps/api/src/sports/data/five-a-side-football.json`. Status when seeded: draft. Sources opened 2026-11-03.

Basis types: **source** = stated by a cited source; **estimate** = my own number built from source statements; **heuristic** = rule of thumb, no source.

Sources: [1] Futsal systematic review (PMC7677190). [2] Physical and physiological demands of futsal (PubMed 29541136). [3] Compendium of Physical Activities, Sports page (pacompendium.com/sports).

The research is on futsal (FIFA's five-a-side indoor game, 4 outfield players plus a goalkeeper on a 40 x 20 m court). Recreational five-a-side outdoors is assumed to be close to it.

| Field | Value | Basis |
|---|---|---|
| energyMix | aerobic 60 / repeatedSprint 30 / explosive 10 | **Estimate** from [1]: mean intensity of at least 85% of max heart rate and about 80% of VO2max, a sprint about every 79 s (about 2 s, about 10 m, under 40 s recovery), high-intensity running 12% and sprinting 5% of match time, about 26 sprints per match. [2]: high-intensity intermittent play. The split itself is not a published figure. |
| keyMovements | change-of-direction, jump-land | **Source** [1]: high-intensity accelerations and decelerations (87 and 80 per match), jumps (9), changes of direction. `jump-land` is weakly supported (9 jumps against 87 accelerations per match) and is a judgement. |
| highLoadAreas | knee, ankle, hip | **Source** for the demand [1]: repeated sprints, accelerations, decelerations and changes of direction, with lower-body power and strength as the stated development focus. The mapping to knee, ankle, hip is an **estimate**; phrased as load only. |
| typicalActivity | 40 min, hard | **Source** [2]: two 20-minute periods in competitive games; [1]: intensity at or above 85% of max heart rate. **Heuristic**: 40 min and `hard` for a recreational session, which may be shorter or easier. |
| recoveryWindowHours | lower 48, upper 24 | **Heuristic.** Lower body does the sprinting and decelerating, so 48 h (middle of 24-72 h) before a heavy lower-body Session. Upper body is loaded little, so 24 h. [1] reports reduced neuromuscular function up to 24 h after a match, which supports not going below 24 h. |
| season | year-round, no months | **Heuristic.** Indoor and artificial-pitch play has no weather season. Greek recreational leagues were not researched. |
| metsPerIntensity | easy 7.0 / moderate 7.8 / hard 9.5 | **Source** [3]: 15610 Soccer, casual, general = 7.0 (easy); 15195 Futsal = 7.8 (moderate); 15605 Soccer, competitive = 9.5 (hard). The mapping of codes to effort levels is a **judgement**; all three values are Compendium entries. |

## Uncertain, for founder review
- The energy mix split is my estimate from the cited time-motion data.
- Futsal data is mostly from competitive (elite and sub-elite) male players; recreational players will run less.
- Futsal has its own Compendium code (15195, 7.8), used for moderate; the soccer codes 15610 and 15605 supply easy and hard. Walking football (15615, 3.5) was deliberately not used.
- Season is year-round for lack of a source; a league calendar (autumn to spring) may suit Greek users better.
- Recovery window is a heuristic.
