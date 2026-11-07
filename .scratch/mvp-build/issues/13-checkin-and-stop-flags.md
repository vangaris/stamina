# 13: Check-in and stop flags

**What to build:** Every day the user answers a 3-tap Check-in, can report anything unusual, and can stop any Session; warning symptoms pause training and point to medical help without naming a condition.

**Blocked by:** 06: Consent, Screening and outcomes, 11: Session screen

**Status:** done

**Roadmap week:** 5

- [x] One-question-per-screen Check-in: sleep, soreness, energy (1–5)
- [x] 'Anything unusual today?' offers: chest pain or pressure, fainting or dizziness, unusual breathlessness, racing or irregular heartbeat, fever or feeling ill, new pain or swelling, head knock
- [x] Stop button on every Session screen opens the same list
- [x] Cardiac / fainting / breathing / heartbeat → Session stopped, local emergency number shown, training paused until 'a doctor has seen me'; fever → rest today; new pain or swelling → area excluded; head knock → paused until cleared
- [x] Any stop flag triggers the relevant Screening questions again
- [x] Copy names no condition; stop flags never sent to the AI provider
- [x] API tests cover each flag's effect on the Program; Playwright covers the Stop button path
