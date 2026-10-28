# 05: Onboarding: who you are and how you play

**What to build:** A new user with an invite code walks the first onboarding screens and their answers are saved: what they want, birth year and country (with the under-18 and non-EU/EEA stops before any consent or health question), sport and when they play, Goal and training week.

**Blocked by:** 04: Sign-in through app-core

**Status:** ready-for-agent

**Roadmap week:** 2–3

- [ ] Invite code required to start; invalid or used codes are rejected
- [ ] Screen 1 asks needs (training / food / both), birth year and country of residence; age < 18 shows 'Stamina is for adults' and stores nothing; non-EU/EEA shows the availability message and stores nothing
- [ ] Sport chosen from the 11 launch sports or 'Other…'; play days or 'It varies'; usual duration and intensity; hot-conditions default for kite, windsurf and beach volleyball
- [ ] Goal (four options) and training week (Sessions/week 2–4, length 30/45/60, available days ≥ Sessions/week) are validated
- [ ] Locale and units pre-filled from the device and editable
- [ ] API tests cover the under-18 and non-EEA rejections and profile persistence; Playwright covers the screens in EN
