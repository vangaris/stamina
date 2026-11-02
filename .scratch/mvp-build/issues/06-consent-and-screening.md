# 06: Consent, Screening and outcomes

**What to build:** Before any health question the user accepts the wellness disclaimer and gives explicit, separate consent; then answers the 10 Screening questions plus the starting-level question on one page, and lands on the correct outcome.

**Blocked by:** 05: Onboarding: who you are and how you play

**Status:** done

**Roadmap week:** 3

- [x] Disclaimer must be accepted; health-data consent is a separate unticked box; consent records are append-only with purpose, text version (EN/EL), granted at and withdrawn at
- [x] Ten yes/no questions on one page, each with 'If unsure, answer yes', plus the starting-level question; Q6 yes opens a body-area picker
- [x] Screening answers are field-encrypted at rest; outcome stored separately
- [x] Outcomes per Safety rules: Q1, Q2, Q3, Q4, Q5, Q7, Q8, Q9a → Referred (pregnancy wording for Q8, and no Limited path); Q9b → Nutrition off and body-composition Goal unavailable; Q6 → area excluded; all no → cleared
- [x] 'A doctor has said I can train' after a referral (not pregnancy) records the statement and sets Limited mode
- [x] Referred screen offers export and deletion and names no condition
- [x] API tests cover every outcome branch with fixture users; Playwright covers a cleared and a referred path

## Notes

- Decided with Vang (2026-11-02): the Referred screen ships a real minimal export (`GET /me/export`) and hard delete (`DELETE /me`), which ticket 20 extends; and a Q9b yes switches a body-composition Goal to General fitness in the same transaction (`goalChanged`), with a notice.
- Screening needs a saved profile, so under-18s and non-EEA people (stopped at onboarding) never reach a health question; the router guard gates every route not in `UNGATED_ROUTES`.
- The delete copy says the sign-in account stays and a new invite is needed to sign in again, and the consent copy promises withdrawal without naming Settings: both are true only once ticket 20 ships withdrawal and account deletion. Safety-critical copy, the migration and the consent texts need Vang's sign-off in the PR.
- Production needs the secret `SCREENING_ENCRYPTION_KEY_PRODUCTION` (set 2026-11-02; a copy is in the local `.env`, keep one in the password manager); losing it makes stored answers unreadable.
