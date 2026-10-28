# What does a Greek solo founder need to sell EU consumer subscriptions, and what does each channel cost?

Type: research
Status: resolved

## Question

Vang is an individual in Athens, Greece, planning to charge EU consumers (later worldwide) a monthly/annual subscription of about €5–10 for a fitness coaching app, starting after a free beta. Find, from primary sources (Greek AADE / gov.gr, EU VAT rules, provider pricing and terms pages):

1. **Registration**: what Greek business registration is needed to receive this revenue (e.g. sole trader / ατομική επιχείρηση with a ΚΑΔ code for software or digital services, freelancer status), what it involves (EFKA contributions, accountant requirement in practice), and the minimum lead time before the first charge.
2. **VAT and invoicing**: VAT on B2C electronically supplied services in the EU (place of supply = customer country, the €10,000 EU-wide threshold, OSS registration in Greece), Greek small-business VAT exemption (if any applies to e-services), and myDATA / e-invoicing obligations for each sale.
3. **Merchant of record vs direct processor**: for Paddle, Lemon Squeezy, and FastSpring (merchants of record) vs Stripe Billing (direct): fees per transaction for EU cards, whether they accept an individual/sole trader in Greece, whether the MoR removes the need for OSS registration and per-sale myDATA invoices (vs a single invoice to the MoR), payout terms.
4. **App stores**: Apple App Store and Google Play subscription commission for small developers (Apple Small Business Program, Google's subscription rate), EU alternative-payment / link-out terms under the DMA, and whether a seller must be a registered business to sell subscriptions in each store from Greece.

Output: a table per channel (fees, who handles VAT, invoicing burden, registration prerequisite, first paid threshold), plus the minimum legal steps and lead time before the first charge.

## Answer

Register (έναρξη, free, same day on gov.gr) before the first charge; e-ΕΦΚΑ ≥ €160/month from then, regardless of revenue. Fees: Stripe ≈2.2%+€0.25 (self-VAT/OSS, per-charge myDATA), Paddle 5%+$0.50 (MoR, bans 'coaching'), Apple 15% / EU 10%, Google 10%+5%.

Full findings: `docs/research/selling-subscriptions-from-greece.md` on branch `research/selling-subscriptions-from-greece` (commit `eaf73c7`).

1. **Registration.** Vang must file **έναρξη εργασιών** (start of business activity) before the first paid transaction [S1]. With a software ΚΑΔ (activity code) this is the free gov.gr «Έναρξη ατομικής επιχείρησης» (start a sole proprietorship), about 24 minutes; ΓΕΜΗ (commercial registry) and chamber registration come with it, because software codes are classed as commercial [S2][S3][S6][S7].
2. **Ongoing costs.** e-ΕΦΚΑ (social insurance) is due by the 10th of the next month, at least **€150.46 + €10 a month** in the reduced category for new professionals, regardless of revenue [S9][S10]. An accountant is legally required only above €30k gross with simple books [S11]. Presumed-income rules do not apply for the first 3 years [S12].
3. **VAT.** Direct B2C sales of electronically supplied services (ESS) are taxed at Greek 24% until cross-border EU B2C sales exceed **€10,000/year**. Above that, VAT is charged at each customer country's rate via **OSS (One-Stop Shop)**, registered in TAXISnet: free, 3–8 days, quarterly returns [S13][S15][S17][S18]. The Greek small-business exemption (Art. 44α, €10,000) can make below-threshold sales VAT-exempt [S19][S20b].
4. **myDATA (AADE e-books).** Every direct charge needs a myDATA document (an 11.2 receipt); no current aggregation rule was found for e-shops [S21][S22b]. An MoR or app store replaces these with B2B invoices to the intermediary [INFERENCE from S13, S24]. Non-EU B2B invoices must be e-invoices from **2 Nov 2026** [S23].
5. **Fees per EU charge.** Stripe direct about 2.2% + €0.25 (Vang does VAT/OSS) [S29]; Stripe Managed Payments +3.5% [S30]; Paddle 5% + $0.50 [S26]; Lemon Squeezy about 7% + $0.50 [S31]; FastSpring quote-only [S32]. All four MoRs remit VAT.
6. **App stores.** Apple Small Business Program 15%; from 1 Oct 2026 in the EU, 10% via own processor or link-out (Vang remits VAT) [S37][S39]. Google Play EEA subscriptions 10% + 5% billing fee; its alternative billing and link-out require a registered business [S41][S43][S44].
7. **Product eligibility.** Paddle bans "coaching" and "muscle building" advice; Stripe Managed Payments excludes "live 1-1 coaching"; Lemon Squeezy bans "services of any kind" [S28][S30][S31]. So MoR access, and ESS status for VAT [S14], depend on Stamina being fully automated software.
8. **Lead time.** Legally the same day, if Vang already has ΑΦΜ (tax number), Taxisnet credentials and a declared business seat. In practice channel onboarding sets it: Stripe first payout 7–14 days; Google personal account needs a 14-day closed test plus up to 7 days review; FastSpring holds the first payout 45 days [S29c][S48][S32].
