# 06: Consent, Screening and outcomes

**What to build:** Before any health question the user accepts the wellness disclaimer and gives explicit, separate consent; then answers the 10 Screening questions plus the starting-level question on one page, and lands on the correct outcome.

**Blocked by:** 05: Onboarding: who you are and how you play

**Status:** ready-for-agent

**Roadmap week:** 3

- [ ] Disclaimer must be accepted; health-data consent is a separate unticked box; consent records are append-only with purpose, text version (EN/EL), granted at and withdrawn at
- [ ] Ten yes/no questions on one page, each with 'If unsure, answer yes', plus the starting-level question; Q6 yes opens a body-area picker
- [ ] Screening answers are field-encrypted at rest; outcome stored separately
- [ ] Outcomes per Safety rules: Q1, Q2, Q3, Q4, Q5, Q7, Q8, Q9a → Referred (pregnancy wording for Q8, and no Limited path); Q9b → Nutrition off and body-composition Goal unavailable; Q6 → area excluded; all no → cleared
- [ ] 'A doctor has said I can train' after a referral (not pregnancy) records the statement and sets Limited mode
- [ ] Referred screen offers export and deletion and names no condition
- [ ] API tests cover every outcome branch with fixture users; Playwright covers a cleared and a referred path
