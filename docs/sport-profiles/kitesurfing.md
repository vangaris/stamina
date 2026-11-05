# Kitesurfing profile: review note

Draft for the founder's review. Data file: `apps/api/src/sports/data/kitesurfing.json`. Sources are numbered as in the file: [1] Compendium water activities; [2] Vercruyssen et al., "Assessment of physiological demand in kitesurfing" (2009); [3] Camps et al., "Variation in heart rate and blood lactate concentration in freestyle kytesurfing" (2011); [4] Mancini et al., "Physiological and Perceptual Internal Load During Kitesurfing Under Real-World Sea Conditions" (2026); [5] "Etesian" (Wikipedia). All were opened.

Basis types: **source** = stated by a cited source; **estimate** = my own number built from source statements; **heuristic** = rule of thumb, no source.

| Field | Value | Basis |
| --- | --- | --- |
| METs easy | 3.0 | **Source** [1], code 18120 "Sailing, boat and board sailing, windsurfing, ice sailing, general". Proxy: the Compendium has no kitesurfing-only entry. |
| METs moderate | 5.0 | **Source** [1], code 18380 "Windsurfing, not pumping for speed". Proxy for a steady, not-all-out session. |
| METs hard | 11.0 | **Source** [1], code 18385 "Windsurfing or kitesurfing, crossing trial". |
| Energy mix | 60 / 25 / 15 (aerobic / repeated sprint / explosive) | **Estimate.** [2]: 30-min crossing trial in light wind, 80.6 % of maximal heart rate, 69.8 % of VO2max, low lactate (2.1 mmol/l), energy demand mainly aerobic. [3]: freestyle heats, 85.4 % of maximal heart rate, 80.0 % of VO2max, lactate 5.2 mmol/l, both aerobic and anaerobic metabolism. [4]: 78.4 % of maximal heart rate. The split itself is mine. |
| Key movements | board-stance, pull, grip, jump-land, rotation, hinge | **Estimate / judgement.** Nature of the sport: board and kite bar (stance, pull, grip), jumps and manoeuvres (jump-land, rotation). The sources opened do not analyse movements; [4] only permitted one controlled jump per leg, and [3] is freestyle. `hinge` is an approximation of the fixed enum, not sourced. |
| High-load areas | lower-back, hip, knee | **Estimate / judgement.** No cited source measures muscle load; chosen from the harness-and-board posture. |
| Typical activity | 45 min, hard | **Source** for the intensity reading: [4] 78.4 % of maximal heart rate, which is in the vigorous band, so `hard`. **Heuristic** for the length: 45 min is the 40-50 min protocol of the study in [4], not a measured typical session. |
| Recovery window | lower 48 h, upper 36 h | **Heuristic**, not a sourced fact. A hard session means long sustained load on the lower back and thighs, so a heavy lower-body session waits 48 h; the upper body is loaded through the bar and harness but less, so 36 h. |
| Season | weather, months 5-9 | **Source** [5]: the Etesian (meltemi) winds blow about mid-May to mid-September in the Aegean. Northern Hemisphere, Greece. |

## Uncertain, for the founder's review

- The Compendium has no kitesurfing-only code. Easy and moderate METs use board-sailing and windsurfing codes as proxies; METs are unchanged (3.0 / 5.0 / 11.0) although typical intensity is now `hard`.
- The energy mix is an estimate from heart-rate and lactate data, not time-motion data.
- Sources [2] and [3] are 10 elite kitesurfers; [4] is 112 recreational men. I read abstracts (and the open full text of [4] for the jump protocol).
- Key movements, high-load areas and `hinge` are judgement; no cited performance source supports them.
- The 45 min duration is a study protocol used as a heuristic; recovery hours are heuristics.
- [5] is an encyclopaedia article, not a climatology; it gives the mid-May to mid-September window only.
