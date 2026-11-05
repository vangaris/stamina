# CrossFit: profile review note

Data file: `apps/api/src/sports/data/crossfit.json`. Status when seeded: draft. Sources opened 2026-11-03.

Basis types: **source** = stated by a cited source; **estimate** = our own number built from source statements; **heuristic** = rule of thumb, no source.

Sources: [1] CrossFit scoping review (PMC11414238). [2] Isabel benchmark workout, energy system contributions (PubMed 38257605). [3] CrossFit Open 25.3 workout description and scorecard (games-assets.crossfit.com). [4] Compendium of Physical Activities, Conditioning Exercise page (pacompendium.com/conditioning-exercise).

CrossFit is mixed-modal: workouts combine weightlifting, gymnastics and cardiovascular work in varying formats, so the profile is a typical blend, not one demand.

| Field | Value | Basis |
|---|---|---|
| energyMix | aerobic 50 / repeatedSprint 30 / explosive 20 | **Estimate.** [1]: workouts challenge aerobic and anaerobic pathways. [2]: a roughly 2-minute maximal workout (Isabel) split 40% oxidative, 45% glycolytic, 15% phosphagen. Typical 10-20 minute workouts ([3] has a 20-minute cap) are more aerobic than that, with heavy lifts adding explosive effort. The split is my estimate. |
| keyMovements | hinge, overhead, push, pull, grip | **Source** [3]: deadlifts, cleans, snatches (hinge, overhead), wall walks (push), rowing (pull). [1]: handstand walk and ring muscle-up (push, pull, overhead). **Judgement**: grip is inferred from bar and ring work; it is not stated in a cited page. |
| highLoadAreas | shoulder, lower-back, hip, knee, wrist | **Estimate** from [3] and [1]: loaded hinging and Olympic lifts (lower back, hip, knee), overhead and wall-walk work (shoulder, wrist). Phrased as load only. |
| typicalActivity | 60 min, hard | **Heuristic**: a class-style hour including warm-up and the workout. **Source** [3] for the cap: a workout cap of 20 minutes; the `hard` label is our reading. |
| recoveryWindowHours | lower 48, upper 48 | **Heuristic.** Workouts load legs and the upper body together, so 48 h (middle of 24-72 h) for both. |
| season | year-round, no months | **Heuristic.** [3]: the Open is a short competition window (March 2025), but recreational training has no season; that part is our judgement. |
| metsPerIntensity | easy 5.0 / moderate 6.5 / hard 7.8 | **Source** [4]: 02061 health club exercise classes, general = 5.0; 02057 body weight resistance exercises, high intensity = 6.5; 02062 health club exercise, conditioning classes = 7.8. 02040 circuit training, vigorous = 7.5 is similar. No Compendium code is CrossFit-specific. |

## Uncertain, for founder review
- The energy mix is my estimate; the only direct measurement found is a 2-minute workout ([2]).
- METs: no CrossFit-specific code. Real maximal workouts may be higher than 7.8.
- Grip as a key movement is inferred.
- [3] is a sponsor-branded competition document (the scorecard of a CrossFit Games Open workout). It is used only for the movements and the 20-minute cap, not for any physiological claim.
- Typical duration and recovery window are heuristics.
- The Games rulebook itself was not used; the Open 25.3 scorecard was. The Games workout pages are rendered by script and could not be read by a plain fetch.
