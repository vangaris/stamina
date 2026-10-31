# 21: Running the beta

**What to build:** Vang can grow and judge the beta: every active user gets 3 invites, users can send feedback, the week-4 prompt captures 'would pay €7.99/month?' and NPS, metrics are computed from Stamina's own data, and a daily digest summarises everything.

**Blocked by:** 14: Adaptation suggestions, 16: Nutrition targets and water, 24: R2 backups, restore test and OpenTofu state

**Status:** ready-for-agent

**Phase:** B (launch: other users, production data, payment methods)

**Roadmap week:** 7

- [ ] 3 invite codes per active user; redemption tracked
- [ ] Feedback button available on every main screen
- [ ] Each user's 4th week shows the 'would you pay €7.99/month?' and NPS prompt once
- [ ] SQL views for activation, W1/W4 retention, adherence, Check-in rate, Adaptation acceptance, meal Log rate, would-pay count and NPS, matching the plan's definitions
- [ ] Daily digest email to Vang: sign-ups, Check-ins, AI cost to date, nightly backup and latest restore-test result, key metrics
- [ ] No third-party analytics; API tests cover metric definitions on fixture data
