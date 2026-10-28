# 11: Session screen

**What to build:** In the gym, the user runs a Session one exercise at a time, logs every set even without signal, rests with a full-screen timer, can swap an exercise, finishes with a session RPE, and the next Session progresses correctly.

**Blocked by:** 09: Program generation with rules only, plus the reveal

**Status:** ready-for-agent

**Roadmap week:** 5

- [ ] Focus mode: slot label and position, target line, set dots, large weight and rep steppers, RPE 6–10 chips, 'Done · set N'
- [ ] Full-screen rest timer with skip; screen kept awake via wake lock where supported
- [ ] Overview table of the whole Session
- [ ] Swap to the tagged easier or harder variant
- [ ] Sets and Session completion are written locally first with device-generated IDs and synced on open, focus or online; replays are ignored by the server
- [ ] Finish asks session RPE 1–10 and stores Load (RPE × minutes)
- [ ] Next Session applies progression: +2.5 kg upper / +5 kg lower when all sets hit the top of the range at or below target; −5 % after 2 sets at ≥ target + 2; hold on missed reps
- [ ] API tests cover progression; mediator tests cover offline queue and sync; Playwright covers a Session logged offline then synced
