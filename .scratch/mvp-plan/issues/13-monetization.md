# Monetization and pricing

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

How does Stamina make money: free beta then subscription, freemium with a paid tier, one-off Program purchase? What is the price per region, trial length, what sits behind the paywall, and when does charging start relative to the first 100 users? Starts from the first-user decision's willingness-to-pay hypothesis (€5–10/month) and includes the payment channel constraint from the platform research (app-store IAP vs web checkout).

## Comments

- 2026-10-28 round 1 (Vang; Q1, Q3–Q7 accepted as recommended):
  - Q1 Model: free trial → one paid subscription; no free tier, no one-off Program purchase.
  - Q2 Price: €7.99/month (Vang: keep), €59.99/year.
  - Q3 Trial: 14 days, no card; explicit subscribe at the end; reminder 2 days before; one-tap cancel.
  - Q4 Lapsed/trial-ended: read-only history + export + deletion; no new Sessions, meal suggestions or Adaptations; nothing deleted.
  - Q5 Beta users: free until payments ship, then founding-member €3.99/month for as long as subscribed if they subscribe within 30 days.
  - Q6 Charging starts for new sign-ups when payments ship (post-MVP increment 1, ~weeks 9–12), gated on the week-4 retention target from Success metrics and go-to-market.
  - Q7 Never: ads, data selling/sharing, token-tier "premium AI" upsells.
  - Q8 Vang has no registered business yet and will register one; lead time and type come from the selling-from-Greece research → a [Vang] needed-by step in the roadmap.
- 2026-10-28 round 2 (Vang accepted all): Q9 Paddle first (eligibility confirmed up front; Stripe direct + accountant fallback); Q10 one VAT-inclusive €7.99 price in every EU country and channel; Q11 register έναρξη the week payments go live, not during the beta; Q12 founding offer replaced by €39.99 first year upfront, renewing €59.99; Q13 charging needs the week-4 retention target **and** ≥ 30 beta users saying they would pay. Replaces Q5's €3.99/month. Agent correction after acceptance: the pay-intent prompt fires in **each user's own week 4**, not calendar week 6, when only a handful of users would exist; with 100 users by week 12 the gate is evaluated around weeks 12–14.

## Answer

| Decision | Value |
|---|---|
| Model | 14-day free trial → one paid subscription. No free tier, no one-off Program purchase |
| Price | **€7.99/month or €59.99/year**, VAT-inclusive, the same in every EU country and channel (web, App Store, Google Play). Other regions later via store price tiers |
| Trial | No card to start. The user subscribes explicitly at the end, with a reminder 2 days before; one-tap cancel |
| Lapsed or trial ended | Read-only history, data export and account deletion stay available. New Sessions, meal suggestions and Adaptations stop. Nothing is deleted |
| Beta users (first 100) | Free until payments ship. Then a founding offer: **€39.99 for the first year, paid upfront**, renewing at €59.99, if taken within 30 days |
| When charging starts | New sign-ups pay once payments ship (post-MVP increment 1). Two conditions: (1) the week-4 retention target from Success metrics and go-to-market is met, and (2) ≥ 30 beta users answer "yes" to an in-app "would you pay €7.99/month?" prompt shown in **each user's 4th week**. With 100 users by week 12, the gate is evaluated around weeks 12–14 |
| Web channel | **Paddle** (merchant of record: collects and pays EU VAT; one myDATA invoice per payout). Vang confirms eligibility with Paddle before building, describing Stamina as fully automated software (Paddle bans "coaching" services). Fallback: Stripe direct + an accountant (VAT/OSS returns and myDATA receipts per charge). Move to Stripe direct when volume pays for the accountant |
| Store channel | If the delivery platform puts Stamina in the stores, in-app digital unlocks use store billing per Apple 3.1.1. EU alternative payments and link-outs are decided with the delivery platform in the post-MVP payments ticket |
| Legal entity | **[Vang]** registers a sole-trader business (έναρξη εργασιών, software ΚΑΔ, free and same-day on gov.gr) in the week payments go live, not during the beta. e-ΕΦΚΑ ≥ ~€160/month starts at registration whatever the revenue |
| Never | Ads; selling or sharing data; token-tier "premium AI" upsells |

**Unit economics** (arithmetic on the research's fee figures, assuming 24% VAT and $0.50 ≈ €0.45): net per €7.99 monthly subscriber ≈ €6.02 Stripe direct, ≈ €5.59 Paddle, ≈ €5.47 Apple or Google. About **29 Paddle subscribers cover e-ΕΦΚΑ**. Thirty founders at €39.99 ≈ €900 upfront ≈ 5½ months of e-ΕΦΚΑ.

**Propagated**:
- Post-MVP Payments and subscriptions now carries these specifics.
- Success metrics and go-to-market sets the week-4 retention target that gates charging.
- The "would you pay?" prompt (each user's 4th week) is added to the MVP feedback feature (≈ 1 h, absorbed by the in-app feedback item).
