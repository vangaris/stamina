# 14: Adaptation suggestions

**What to build:** When the user plays unexpectedly, feels rough, misses Sessions or carries too much Load, Stamina suggests a specific change with a plain numeric reason; the user accepts or declines and nothing changes automatically.

**Blocked by:** 12: Activities and Load, 13: Check-in and stop flags

**Status:** ready-for-agent

**Roadmap week:** 5

- [ ] Unplanned hard Activity inside the next Session's recovery window → first option that fits: move ±1 day, else swap to recovery, else −1 set per exercise
- [ ] Check-in with 2 of 3 answers ≤ 2 → lighter version (RIR +1, −1 set) or recovery; soreness ≤ 2 in a targeted area → swap those exercises; a good Check-in never increases load
- [ ] Early Deload suggested when Load > 1.3 × average for 2 weeks, 3 poor Check-ins in 5 days, or 2 Sessions at ≥ target + 2; declined suggestions re-ask after 3 days only if still true
- [ ] Missed Sessions: 1 → skip; ≥ 2 in a week → repeat the week; ≥ 2 weeks off → restart Block at week 1 with RIR +1
- [ ] Suggestion cards inline at the top of Today with change, reason (EN/EL templates filled with numbers), Accept and Keep my plan
- [ ] Accept creates a new Session revision (supersedes the old); accepting an outdated revision is rejected and the client shows the latest; accepting offline is queued
- [ ] API tests cover every trigger with fixture users (seed persona pickup padel → swap Thursday; basketball double game week → Deload suggestion); Playwright covers 'I played' → accept
