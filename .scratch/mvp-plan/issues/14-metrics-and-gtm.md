# Success metrics and go-to-market for the first 100 users

Type: grilling
Status: resolved
Blocked by: 02, 12

## Question

What numbers define MVP success (activation, week-1/week-4 retention, Sessions logged per week, Check-in rate, NPS, and the yes-count on the "would you pay €7.99/month?" prompt shown in each user's 4th week) with target values, and how are the first users acquired for the free invite-only beta (~30 by week 8, 100 by week 12), in what order, by which week? The week-4 retention target also gates charging (Monetization and pricing: charging needs that target plus ≥ 30 "yes" answers, evaluated around weeks 12–14). Starting point from the first-user decision: ~30 from Vang's own network (padel, beach volleyball, kite, CrossFit, team-sport contacts); the rest via padel and tennis clubs, beach-volleyball groups, kite and windsurf schools, running and CrossFit/HYROX communities, amateur basketball and 5-a-side leagues in Athens, coaches, communities and content.

## Comments

- 2026-10-28 (graduated from Not yet specified): this ticket also decides
  1. **how the metrics are measured**: privacy-friendly product analytics (tool, EU hosting, first paid threshold) and how it fits health-data consent (no health data in analytics, per Cloud setup);
  2. **product name and brand**: whether the beta runs as "Stamina" or a real name, when naming happens, and when the brand theme replaces the placeholder tokens (Core screens).
- 2026-10-28 round 1 (Vang accepted all recommendations Q1–Q8). Timing fact: starting the build now puts week 8 around late December 2026 and week 12 around late January 2027, which is indoor season in Greece.

## Answer

**Metrics** (all computed from Stamina's own Postgres as SQL views feeding the daily digest; targets are **[INFERENCE] hypotheses**, not benchmarks)

| Metric | Definition | Target |
|---|---|---|
| Activation | Onboarding finished **and** first Session logged within 7 days | ≥ 60 % |
| Week-1 / **week-4 retention** | Logged a Session, Check-in or Activity in days 8–14 / 22–28 | W4 ≥ 40 % (**charging gate**) |
| Adherence | Sessions done ÷ planned, per active user-week | ≥ 60 % |
| Check-in rate | Share of days with a Check-in among active users | ≥ 50 % |
| Adaptation acceptance | Accepted ÷ shown suggestions (core differentiator signal) | ≥ 50 % |
| Meal Log rate | Meals logged ÷ suggested (Nutrition users) | tracked |
| "Would pay" | "Yes" answers to the prompt in each user's 4th week | ≥ 30 (**charging gate**) |
| NPS | Asked once in the same week-4 prompt | ≥ 30 |

If W4 retention misses, the month after week 12 goes to product fixes, not payments.

**Analytics and consent**
- No third-party product analytics in the MVP (no SDK, no extra processor, no cookie banner).
- Metrics are "service improvement on pseudonymised aggregates" in the privacy notice and the DPIA.
- Landing page (if built): Cloudflare Web Analytics, cookieless; terms UNVERIFIED, check before use.

**Go-to-market (winter-aware)**

| Build week | Action | Users |
|---|---|---|
| 1–2 | **[Vang]** lists ~40 network contacts who fit the ICP (padel, CrossFit, team sports, running) | – |
| 5 | Landing page + waitlist (name required) | – |
| 8 | **Wave 1**: ~30 from the network, invited in batches of 10 across the week | ~30 |
| 9–10 | Indoor-season partners: 2 padel clubs, 1 CrossFit/HYROX box, 1 amateur basketball or 5-a-side league, 1 running club; coach/owner gets free access, members get a beta code; one Greek post/reel from real screens for partners to share | ~65 |
| 11–12 | Every active user gets 3 invites for teammates and training partners | ~100 |
| Spring (post-MVP) | Kite and windsurf schools, beach-volleyball groups | – |

- **No content marketing** during the 8 build weeks.
- **User calls**: 5 × 15-min calls with wave-1 users in week 9 and 5 more in week 11; notes become `feedback` issues.

**Name and brand**
- "Stamina" is a working codename, likely weak as a trademark.
- **[Vang]** shortlists 3 names; each gets an EUIPO/TMview check (classes 9, 41, 44; class choice to be confirmed in the check) and a `.com` / `.gr` domain check. Name chosen by **build week 4**. Borderline cases go to the lawyer as a 7th question.
- The beta ships the placeholder theme + a text wordmark. The real palette, type and logo come after week 12 via the theme layer.

**Propagated**
- 8-week roadmap: name check (~1 h) and landing page (~3 h) add to the build budget.
- Legal review: optional 7th lawyer question on the name.
