# Where is the "not a medical device" line for adaptive coaching software?

Type: research
Status: resolved

## Question

Under EU MDR 2017/745 (Rule 11, Article 2 definition of medical device) and MDCG 2019-11 software qualification guidance, plus the US FDA General Wellness policy and the 21st Century Cures Act software exclusions, and the UK MHRA software guidance: at what point does an app that generates and adapts training, nutrition, mobility and recovery advice from user inputs (goals, RPE, sleep, soreness, PAR-Q answers, injuries) become a medical device? List the concrete product behaviours and marketing claims that cross the line (e.g. "treats", "prevents injury", diagnosing pain, rehab protocols, disease-specific nutrition) and the ones that stay wellness. Output: a do/don't table usable as product and copy rules.

## Answer

Wellness if every surface targets general fitness, performance, mobility, recovery, sleep, weight; rehab, pain diagnosis, disease-specific programs/diets, risk scores or clinical alerts make it a device (EU: Class IIa+, Notified Body). Claims, not algorithms, decide.

Full findings: `docs/research/medical-device-boundary.md` on branch `research/medical-device-boundary` (commit `7d3abd1`).

- **Intended purpose decides it, not the algorithm or how risky it is.** Under all three regimes, software becomes a medical device when the manufacturer intends it for a medical purpose. That purpose is read from the label, the instructions, the UI, the app-store text and category, ads, social media and repeated testimonials. A disclaimer cannot undo a medical claim made somewhere else ([MDR Art. 2(12)][mdr-oj]; [MHRA p.11][mhra]; [FDA GW 2026 §III][fda-gw]). MDCG states that the risk of harm "is not a criterion" for qualification ([MDCG 2019-11 §3.1][mdcg]).
- **Stays wellness:** generating and adapting a Program for general fitness, strength, endurance, sport performance, body composition or weight management, general mobility, recovery, sleep habits and stress. That includes Adaptation driven by RPE, sleep and soreness Check-ins, plus calorie and macro targets, meal plans and Log trends. All three regulators name these explicitly as non-device fitness or wellness functions ([MDCG §3.1][mdcg]; [FDA MMA App. A #6][fda-mma]; [FDA GW §III][fda-gw]; [MHRA p.12, p.21][mhra]).
- **Crosses the line:** anything aimed at a **specific disease, injury or disability**, whether it diagnoses, monitors, treats, alleviates or (for disease) prevents or predicts it. Examples: rehab or return-from-injury protocols, exercises chosen to relieve pain, telling the user what their pain probably is, symptom matching or likelihood ranking, individual disease-risk scores, diets for a named disease, insulin or medication dosing, and alerts that use clinical thresholds or call a value "abnormal".
- **EU is the strictest regime.** The EU has nothing like FDA's enforcement discretion or its "may help living well with [chronic disease]" wellness category. Any disease-directed function is medical device software, and Rule 11 makes most of it **Class IIa or higher, which needs a Notified Body** ([MDR Annex VIII Rule 11, Art. 52(6)][mdr-oj]). An EU-first product therefore cannot use the US wellness latitude for disease-adjacent coaching.
- **"See a professional" signposting is allowed** if it stays generic: no named condition, no "abnormal" or diagnostic framing, no clinical thresholds, and no ongoing disease monitoring ([FDA GW 2026 §III][fda-gw]; [MHRA symptom-checker appendix][mhra-sym]). PAR-Q-style screening that only gates the Program or refers the user on fits this pattern. Turning the answers into a risk score or a likely condition does not.
- **Grey zones:**
  - **"Prevents injury."** The EU and UK definitions list *prevention* only for disease, and MHRA says injury-prevention claims fall outside the prevention limb. FDA's position was not found.
  - **Programming around a user-reported injury by excluding exercises.** No source covers this directly.
  - **Pregnancy-specific guidance.** FDA lists motivational guidance for pregnant people under enforcement discretion, so it may be a device in the US.
