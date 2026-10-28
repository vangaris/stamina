# 13: Check-in and stop flags

**What to build:** Every day the user answers a 3-tap Check-in, can report anything unusual, and can stop any Session; warning symptoms pause training and point to medical help without naming a condition.

**Blocked by:** 06: Consent, Screening and outcomes, 11: Session screen

**Status:** ready-for-agent

**Roadmap week:** 5

- [ ] One-question-per-screen Check-in: sleep, soreness, energy (1–5)
- [ ] 'Anything unusual today?' offers: chest pain or pressure, fainting or dizziness, unusual breathlessness, racing or irregular heartbeat, fever or feeling ill, new pain or swelling, head knock
- [ ] Stop button on every Session screen opens the same list
- [ ] Cardiac / fainting / breathing / heartbeat → Session stopped, local emergency number shown, training paused until 'a doctor has seen me'; fever → rest today; new pain or swelling → area excluded; head knock → paused until cleared
- [ ] Any stop flag triggers the relevant Screening questions again
- [ ] Copy names no condition; stop flags never sent to the AI provider
- [ ] API tests cover each flag's effect on the Program; Playwright covers the Stop button path
