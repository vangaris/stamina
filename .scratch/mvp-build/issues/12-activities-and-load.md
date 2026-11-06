# 12: Activities and Load

**What to build:** The user logs 'I played' in one tap and sees its Load; planned Activities from onboarding appear in the week; weekly Load is compared with the user's own 4-week average.

**Blocked by:** 09: Program generation with rules only, plus the reveal

**Status:** in-progress

**Roadmap week:** 5

- [x] 'I played' sheet: sport, duration, effort, hot toggle; shows Load before saving
- [x] Planned Activities generated from onboarding play days; 'It varies' sports have no planned Activities
- [x] Weekly Load = Session Loads + Activity Loads; 4-week average computed per user
- [x] Activities are append-only and work offline
- [x] API tests cover Load sums and averages; mediator test covers offline Activity logging
