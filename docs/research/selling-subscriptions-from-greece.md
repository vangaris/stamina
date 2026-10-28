# Selling EU consumer subscriptions from Greece as a solo founder

Ticket: `.scratch/mvp-plan/issues/30-selling-subscriptions-from-greece.md`. All sources accessed **2026-10-28**. Bracketed numbers like [S3] refer to the Sources list at the end. Labels:
- **[INFERENCE]**: my reasoning, not stated by a source.
- **UNVERIFIED**: I could not confirm it from a primary source.

## Answer

1. **Registration.** Vang must file **έναρξη εργασιών** (start of business activity) before the first paid transaction [S1]. With a software ΚΑΔ (activity code) this is the free gov.gr «Έναρξη ατομικής επιχείρησης» (start a sole proprietorship), about 24 minutes; ΓΕΜΗ (commercial registry) and chamber registration come with it, because software codes are classed as commercial [S2][S3][S6][S7].
2. **Ongoing costs.** e-ΕΦΚΑ (social insurance) is due by the 10th of the next month, at least **€150.46 + €10 a month** in the reduced category for new professionals, regardless of revenue [S9][S10]. An accountant is legally required only above €30k gross with simple books [S11]. Presumed-income rules do not apply for the first 3 years [S12].
3. **VAT.** Direct B2C sales of electronically supplied services (ESS) are taxed at Greek 24% until cross-border EU B2C sales exceed **€10,000/year**. Above that, VAT is charged at each customer country's rate via **OSS (One-Stop Shop)**, registered in TAXISnet: free, 3–8 days, quarterly returns [S13][S15][S17][S18]. The Greek small-business exemption (Art. 44α, €10,000) can make below-threshold sales VAT-exempt [S19][S20b].
4. **myDATA (AADE e-books).** Every direct charge needs a myDATA document (an 11.2 receipt); no current aggregation rule was found for e-shops [S21][S22b]. An MoR or app store replaces these with B2B invoices to the intermediary [INFERENCE from S13, S24]. Non-EU B2B invoices must be e-invoices from **2 Nov 2026** [S23].
5. **Fees per EU charge.** Stripe direct about 2.2% + €0.25 (Vang does VAT/OSS) [S29]; Stripe Managed Payments +3.5% [S30]; Paddle 5% + $0.50 [S26]; Lemon Squeezy about 7% + $0.50 [S31]; FastSpring quote-only [S32]. All four MoRs remit VAT.
6. **App stores.** Apple Small Business Program 15%; from 1 Oct 2026 in the EU, 10% via own processor or link-out (Vang remits VAT) [S37][S39]. Google Play EEA subscriptions 10% + 5% billing fee; its alternative billing and link-out require a registered business [S41][S43][S44].
7. **Product eligibility.** Paddle bans "coaching" and "muscle building" advice; Stripe Managed Payments excludes "live 1-1 coaching"; Lemon Squeezy bans "services of any kind" [S28][S30][S31]. So MoR access, and ESS status for VAT [S14], depend on Stamina being fully automated software.
8. **Lead time.** Legally the same day, if Vang already has ΑΦΜ (tax number), Taxisnet credentials and a declared business seat. In practice channel onboarding sets it: Stripe first payout 7–14 days; Google personal account needs a 14-day closed test plus up to 7 days review; FastSpring holds the first payout 45 days [S29c][S48][S32].

## 1. Greek registration

| Item | Fact | Source |
|---|---|---|
| When | Register "πριν την πραγματοποίηση οποιασδήποτε συναλλαγής" (before carrying out any transaction), via the start-of-business declaration on myAADE. [INFERENCE] A free beta with no charges does not trigger this. | S1 |
| Route A: gov.gr | «Έναρξη ατομικής επιχείρησης» (start a sole proprietorship) is for the "εμπορικό κλάδο" (commercial sector). It is fully digital, "χωρίς… προεγγραφή στο ΓΕΜΗ και στον eΕΦΚΑ" (no pre-registration with ΓΕΜΗ or e-ΕΦΚΑ needed). You need a valid ΑΦΜ, Taxisnet credentials, and a seat ID: ΑΤΑΚ (property ID) or the e-lease number. You also choose the book category, the VAT regime and the ΚΑΔ. The output is a Βεβαίωση Έναρξης Εργασιών (start certificate). | S2 |
| Cost and time | Mitos: "Provided without cost"; "Estimated Time (digitally): 24 minutes". This covers both the tax start and ΓΕΜΗ registration. | S3 |
| Route B: AADE | Codes that are not commercial (e.g. coaching only) go through AADE «Τα αιτήματά μου» (My Requests) with form Δ211. Processing time is UNVERIFIED. | S1 |
| No ΑΦΜ yet? | Apply "αποκλειστικά ηλεκτρονικά" (online only). Identity is checked via myAADElive, in person, or by "άμεση βιντεοκλήση" (instant video call). Duration is UNVERIFIED. | S4 |
| ΚΑΔ nomenclature | ΚΑΔ 2025 (based on NACE Rev. 2.1) applies from **1/3/2026**. You can pick "όσους ΚΑΔ επιθυμείτε" (as many codes as you like). | S5, S1 |
| Candidate ΚΑΔ 2025 | 58.29.36.00 «Διάθεση άλλων εφαρμογών διαδικτυακά» (other applications provided online); 58.29.41.00 software-licence services; 62.10.xx programming; 63.91.10.00 web-portal content; 85.51.00.05 «Υπηρεσίες προπονητή αθλητών» (athletes' coach services); 93.13.00.04 «Υπηρεσίες καθηγητή φυσικής αγωγής ή γυμναστή» (PE teacher / trainer services). | S5 |
| Commercial vs not | ΦΕΚ Β' 3560/2026 lists 58.29.3x, 62.10.xx and 63.91.10 as **commercial** (εμπορική). ΦΕΚ Β' 3994/2026 lists 85.51.00.05 and 93.13.00.04 as **non-commercial**. (Both read from copies hosted by the Piraeus chamber, not from et.gr.) | S6 |
| ΓΕΜΗ and chamber | A sole proprietorship carrying out commercial acts registers in ΓΕΜΗ (law 4919/2022, art. 16). Chamber registration is mandatory if there is "τουλάχιστον μία δραστηριότητα με εμπορικό χαρακτήρα" (at least one commercial activity). ΓΕΜΗ fees are €10 to register and €30 a year (interim, per ΕΒΕΑ). The current chamber subscription is UNVERIFIED. | S7, S8 |
| Freelancer vs sole trader (ελεύθερος επαγγελματίας / ατομική επιχείρηση) | Both are taxed in the same category: business income, "συμπεριλαμβανομένων και των πρώην ελευθέριων επαγγελμάτων" (including the former liberal professions). The 2026 scale is 9/20/26/34/39/44%, with brackets at €10k/20k/30k/40k/60k. | S12 |
| Presumed income (τεκμαρτό) | Arts 28Α–28Β (minimum presumed income) "δεν εφαρμόζονται για τα τρία (3) πρώτα έτη" (do not apply for the first three years). | S12 |
| e-ΕΦΚΑ | Register "μέχρι τη δέκατη (10η) ημέρα του επόμενου μήνα" (by the 10th of the following month). On a first-ever start you can choose the reduced special category "για μία πενταετία" (for five years). | S9 |
| e-ΕΦΚΑ 2026 amounts | Special (reduced) category: **€150.46/month**. 1st category: €250.77. Plus €10/month unemployment contribution. [INFERENCE] Minimum about €1,926/year, owed regardless of revenue. | S10 |
| Business levy (τέλος επιτηδεύματος) | Abolished for natural persons from tax year 2024 (law 5162/2024, art. 3). | S12b |
| Accountant | Form Ε3 (business financial statement) must be filed by an accountant for double-entry books, or for simple books "με ακαθάριστα έσοδα πάνω από… 30.000 ευρώ" (gross revenue over €30,000). Below that, no legal requirement was found [INFERENCE]. | S11 |

## 2. VAT and invoicing

| Topic | Fact | Source |
|---|---|---|
| Place of supply, B2C ESS | VAT Directive Art. 58: taxed where the customer "is established, has his permanent address or usually resides". | S13 |
| €10,000 threshold | Art. 59c: home-country VAT applies if cross-border B2C telecom, broadcasting and electronic (TBE) sales "does not in the current calendar year exceed EUR 10 000" and did not in the prior year. Destination VAT applies "as of that time" the threshold is crossed. Opting in early binds you for 2 years. | S13 |
| ESS test | Reg. 282/2011 Art. 7(1): "essentially automated and involving minimal human intervention". This includes services "automatically generated from a computer… in response to specific data input by the recipient". It excludes professionals who "advise clients by e-mail" and courses "delivered by a teacher over the Internet". | S14 |
| [INFERENCE] Stamina | Programs generated by algorithm fit Art. 7(2)(c). If a human coach is part of the service, it may not be an ESS. In that case the general rule (Art. 45) taxes it where the supplier is established, i.e. Greece. No ruling specific to fitness apps was found. | S13, S14 |
| AADE on the threshold | Below the "κατώφλι 10.000 ευρώ" (€10,000 threshold), supplies are taxed "στο κ-μ εγκατάστασης του προμηθευτή" (in the supplier's Member State). Above it, destination VAT is "υποχρεωτικά" (mandatory), via OSS or local registration. | S15, S16 |
| OSS registration | Done "ηλεκτρονικά μέσω… TAXISnet" (online through TAXISnet). Free, takes "3 έως 8 ημέρες" (3 to 8 days). Deadline: before the first supply, or "μέχρι τη δέκατη μέρα του μήνα που ακολουθεί την πρώτη συναλλαγή" (by the 10th of the month after the first transaction). | S17 |
| OSS returns | Quarterly, due by the end of the following month. Nil returns are required. Input VAT cannot be offset in OSS. Greek domestic sales stay on the Greek VAT return. | S18 |
| Greek VAT rate | 24% (myDATA VAT category 1). | S21 |
| SME exemption | Arts 44–44ζ of the VAT Code (ν. 5144/2024, amended by ν. 5222/2025). The national threshold is "10.000 ευρώ" (€10,000). It ends "από την συναλλαγή με την οποία συντελείται η υπέρβαση" (from the transaction that crosses the threshold). There is no input-VAT deduction. A cross-border SME scheme (Art. 44γ, EU turnover up to €100,000) requires an "-ΕΧ" VAT number and quarterly reports. | S19, S20 |
| SME + ESS | EC notes, scenario 1: below €10k, cross-border TBE supplies "are located in MS 1… all these supplies are VAT exempt" under the home SME scheme and count toward its turnover. OSS and the SME scheme cannot be used in the same Member State. | S20b, S19 |
| myDATA document per sale | Retail services are transmitted as "11.2 – Απόδειξη Παροχής Υπηρεσιών" (service receipt). Exemption code 30 covers OSS sales, code 15 the SME exemption. [INFERENCE] 11.2 + code 30 for OSS sales; no AADE example of that pairing was found. | S21, S22 |
| Aggregation | Receipts issued without a fiscal device are "διαβιβάζονται αναλυτικά ανά στοιχείο" (transmitted one document at a time). This is from a 2021 FAQ, so current e-shop rules are UNVERIFIED. | S22b |
| B2B e-invoicing | Mandatory for domestic B2B, for non-EU recipients "πλην συναλλαγών λιανικής" (except retail), and for B2G. **B2C is out of scope**. Businesses under €1M: mandatory from **2/11/2026**, transition to 31/1/2027. AADE's free «timologio» and «myDATAapp» tools qualify. | S23 |
| Payments via MoR | B2B services are taxed where the customer is established (Art. 44), with reverse charge inside the EU (Art. 196). [INFERENCE] An invoice to a non-EU MoR is type 2.3 and falls under the e-invoice mandate; to an EU MoR it is type 2.2. | S13, S21, S23 |
| App stores | Reg. 282/2011 Art. 9a: a platform "such as a marketplace for applications" is presumed to be the supplier (deemed supplier). A pure payment processor is not (Art. 9a(3)). | S14, S24 |
| Card-acceptance link to AADE | Stripe has a help page titled "ePOS registry compliance in Greece": users "may need to register and report with… AADE". The body would not render. AADE's POS–cash-register link (Α.1155/2023) covers point-of-sale payments. Whether online card-not-present payments fall under it is **UNVERIFIED**. | S33, S35 |
| Non-EU customers | The UK requires non-UK suppliers of digital services to UK consumers to register for UK VAT, unless they sell through a platform. Other countries not researched. | S36 |

## 3. Per-channel comparison: web checkout

| | Stripe Billing (direct) | Stripe Managed Payments (MoR) | Paddle (MoR) | Lemon Squeezy (MoR) | FastSpring (MoR) |
|---|---|---|---|---|---|
| **Fee per EU card charge** | 1.5% + €0.25 (standard EEA card); 2.8% + €0.25 (premium card). Billing +0.7%. Stripe Tax optional, +0.5%. Disputes €20 each. [S29] | Payments fees + **3.5%**. Billing is extra. [S29][S30] | **5% + $0.50**. "Under 10$ value… bespoke pricing." [S26] | 5% + 50¢, +1.5% outside the US, +0.5% for subscriptions. [INFERENCE] About 7% + 50¢ for an EU subscription. Payout fee 1% for non-US banks. [S31] | Quote-based ("revenue-sharing"). No public rate. [S32] |
| **[INFERENCE] Fee on €9.99** | about €0.47 (4.7%) + VAT admin | about €0.82 (8.2%) | about €0.95 (9.5%) at roughly €0.45 per $0.50 | about €1.15 (11.5%) | UNVERIFIED |
| **Who handles VAT** | **Vang**: Greek VAT, then OSS above €10k. Stripe Tax only calculates. | Stripe/Link as MoR "files and remits" in 80+ countries. Vang stays liable where it doesn't. [S30] | Paddle: "VAT/Sales Tax collection, filing, and payment". [S27] | LS: "We take on the liability of tax collection". [S31] | FastSpring: "collect and remit… respond to any audits". [S32] |
| **Invoicing burden (Greece)** | One myDATA document per customer charge, plus OSS returns. | [INFERENCE] One B2B invoice per payout to the MoR. myDATA mapping UNVERIFIED. | Paddle issues a "Reverse Invoice" (self-billing) per payout. [S27b] | A "reverse invoice" per payout. [S31] | UNVERIFIED |
| **Accepts a Greek individual** | Greece is supported. The page summary says you can sell "if you have not established a separate business entity". [S29b] | GR is a "Supported business location", subject to "eligibility review". Whether individuals qualify is UNVERIFIED. [S30] | Business verification is "not required for individuals or sole traders". ID check via Sumsub. A website domain is needed. [S28b] | Greece is a supported payout country. Whether new sellers are still onboarded is UNVERIFIED: the Jan 2026 post points users to migrate to Stripe Managed Payments. [S31] | The payout account can be "Individual". Seller eligibility is UNVERIFIED. [S32] |
| **Product restriction** | — | "fully automated digital product"; human "live 1-1 coaching" does not qualify. [S30] | Bans "coaching" human services and "Medical advice… (e.g., weight loss, muscle building)". [S28] | Bans "Services of any kind". [S31] | UNVERIFIED |
| **Payout / first paid threshold** | First payout in 7–14 days. Greece: 7-day settlement. Daily, weekly or monthly schedule. [S29c] | Same as Stripe [INFERENCE] | Monthly, sent "by the 15th", minimum $100 (or €100). Wire or Payoneer. [S27c] | Twice a month (14th and 28th), 13-day hold, $50 minimum, paid in USD. [S31] | **45-day first hold**, then twice a month with a 14-day delay. $100 minimum. [S32] |
| **Registration prerequisite** | Greek έναρξη before the first charge [S1]. OSS once over €10k. | Greek έναρξη. No OSS [INFERENCE]. | Same | Same | Same |

## 4. Per-channel comparison: app stores

| | Apple App Store | Google Play |
|---|---|---|
| **Commission, store billing** | Small Business Program: 15% for developers "new to the App Store" or under $1M proceeds [S37]. Standard rate is 30%, or 15% for subscriptions after year one [S38]. EU storefronts: 15% for SBP members on In-App Purchase, standard 26% [S39]. | EEA from 30 Jun 2026: auto-renewing subscriptions pay **10% + 5% billing fee**, at every tier [S41][S42] |
| **EU alternative payments / link-out** | From **1 Oct 2026**, unified EU terms: own in-app payment processor **10%** for SBP members (20% standard). Out-of-app link **10%** (15% standard) on sales "within 7 days of the link tap". The choice is fixed for 12 months. Vang then remits the taxes and reports to Apple monthly. The Initial Acquisition Fee and Store Services Fee are eliminated. [S39] | Alternative billing (EEA): subscriptions pay 10%. External offers: 0% initial fee, 10% on subscriptions bought within 24 hours of the link. **Both require "registered as a business"** [S43][S44] |
| **Who handles VAT** | Apple Distribution International acts as "commissionaire" for Greece and the EU [S38]. With alternative payments, Vang is responsible [S39]. | "Google is responsible for… remitting VAT" when Play Billing is used [S45]. Otherwise Vang [INFERENCE]. |
| **Account and registration** | $99/year. "If you are a sole proprietor/single-person business, you must join as an individual". Your legal name is shown as the seller [S40]. | $25 once [S46]. Personal accounts "can monetize" with a payments profile [S47]. New personal accounts need a closed test with "12 testers… for at least 14 days", then review "usually… seven days or less" [S48]. Organisation accounts need D-U-N-S and are mandatory for some "Health apps". Whether fitness counts is UNVERIFIED [S47]. |
| **Trader / public identity** | DSA trader status: earning revenue (e.g. In-App Purchase) counts toward being a trader. You must publish an address or P.O. Box, phone and email, verified with "business or legal records" [S49]. | Monetising developers have their "full address" displayed [S50]. No DSA trader page found (UNVERIFIED). |
| **Invoicing burden** | [INFERENCE] One B2B invoice per Apple payout to ADI (Ireland), myDATA type 2.2. Not confirmed by AADE. | [INFERENCE] One B2B invoice per payout to the Google entity. Not confirmed. |
| **Must be a registered business?** | Apple: no, individuals can enrol. Greek law still requires έναρξη before transactions [S1]. [INFERENCE] DSA trader verification likely needs the έναρξη certificate. | Play Billing: no. Alternative billing and external offers: yes. |

## 5. Minimum legal steps before the first charge

| # | Step | Lead time | Source |
|---|---|---|---|
| 0 | ΑΦΜ and Taxisnet credentials (if missing), plus a seat with ΑΤΑΚ or a declared lease | Online. Duration UNVERIFIED. | S4, S2 |
| 1 | Έναρξη εργασιών via gov.gr: pick ΚΑΔ 58.29.36.00 and/or others, simple books, and a VAT regime (normal 24% or SME Art. 44α). ΓΕΜΗ and chamber registration come with it. | about 24 min, free, same day | S2, S3, S19 |
| 2 | Invoicing tool: AADE timologio / myDATAapp (free) or a certified provider | Same day [INFERENCE] | S23 |
| 3 | Payment channel onboarding: Stripe KYC; Paddle ID + domain; Apple enrolment + Paid Apps Agreement + trader verification; Google bank verification ("up to 5 days") + 14-day test | Days to about 3 weeks. Apple, Paddle and Stripe KYC durations UNVERIFIED. | S48, S50 |
| 4 | e-ΕΦΚΑ registration (reduced category) | By the 10th of the next month | S9 |
| 5 | OSS (direct sales only, once over €10k or by opting in) | 3–8 days; may be filed by the 10th of the month after the first supply | S17 |

## Sources

All accessed 2026-10-28.

**Greek registration and tax**
- S1 AADE, Έναρξη επιχειρηματικής δραστηριότητας φυσικού προσώπου (start of business activity for individuals): https://aade.gr/enarxi-epiheirimatikis-drastiriotitas-fysikoy-prosopoy
- S2 gov.gr, Έναρξη ατομικής επιχείρησης (start a sole proprietorship): https://www.gov.gr/el/services/1000997/enarxe-atomikes-epikheireses
- S3 Mitos, Starting a sole proprietorship: https://en.mitos.gov.gr/index.php/%CE%94%CE%94:Starting_a_sole_proprietorship
- S4 AADE Registry Procedures Guide v1.2: https://www.aade.gr/sites/default/files/2026-06/odigos_diadikas_Mitrwou-may2026.pdf
- S5 AADE, ΚΑΔ 2025 change: https://www.aade.gr/allagi-antistoihisi-kad-me-toys-ishyontes-apo-132026
  - List: https://www.aade.gr/sites/default/files/2026-03/Economic-activity-codes%202025-KAD%202025.pdf
- S6 ΦΕΚ Β' 3560/2026 and Β' 3994/2026 (pim.gr copies):
  - https://www.pim.gr/phocadownload/2026/fek_b_3560_2026.pdf
  - https://www.pim.gr/phocadownload/2026/fek_b_3994_2026.pdf
- S7 businessportal.gr, Ποιοι εγγράφονται στο ΓΕΜΗ (who registers in ΓΕΜΗ): https://www.businessportal.gr/ποιοι-εγγραφονται-στο-γεμη/
  - EEA (Athens professional chamber): https://www.eea.gr/ipiresies-eea/e-epimelitirio/odigies-ilektronikis-eggrafis-atomikon-epixeiriseon-sto-eea/
- S8 ΕΒΕΑ (Athens Chamber of Commerce and Industry), Ατομικές επιχειρήσεις (sole proprietorships): https://acci.gr/ατομικές-επιχειρήσεις
- S9 e-ΕΦΚΑ, Εγγραφή μη μισθωτών (registration of the self-employed): https://www.e-efka.gov.gr/el/elektronikes-yperesies/eggrafi-mi-misthoton
- S10 e-ΕΦΚΑ, new professionals and circular 6/2026:
  - https://www.e-efka.gov.gr/el/asphalismenoi/me-misthotoi/neo-systhma-asfalistikon-eisforon/neoi-epaggelmaties
  - https://www.e-efka.gov.gr/el/egkyklioi-kai-genika-eggrapha/egkyklios-62026
- S11 AADE circular Ε.2028/2024: https://www.aade.gr/sites/default/files/2024-04/E.2028_2024.pdf
- S12 Income tax sources:
  - AADE Ε1 2026 instructions: https://www.aade.gr/sites/default/files/2026-03/Odigies_E1_2026_0.pdf
  - minfin: https://minfin.gov.gr/forologiki-politiki/forologikos-odigos/forologia-eisodimatos/
  - AADE circular Ε.3068/2025: https://www.aade.gr/sites/default/files/2025-11/O3068_2025.pdf
  - AADE decision 4/2026: http://elib.aade.gr/elib/DesktopModules/ViewModule/Documents/gr-ded-2026-4_en_the-4_2026.pdf
- S12b AADE circular Ε.3064/2024: https://www.aade.gr/sites/default/files/2024-12/%CE%BF3064.pdf

**VAT and invoicing**
- S13 Directive 2006/112/EC (consolidated 01.01.2025): https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006L0112-20250101
- S14 Reg. 282/2011 (consolidated 01.07.2021): https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011R0282-20210701
- S15 AADE OSS page: http://www.aade.gr/oss
- S16 AADE OSS FAQ v2.0: https://www.aade.gr/sites/default/files/2026-08/FAQs_one-stop-shop_ilektroniko_emporio.pdf
- S17 Mitos, Εγγραφή υποκειμένων σε ΦΠΑ στα ειδικά καθεστώτα OSS/IOSS (VAT registration for the OSS/IOSS special schemes). Portal: https://www1.aade.gr/aadeapps3/oss_home
- S18 European Commission, OSS declare and pay: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en
- S19 AADE SME scheme FAQ: https://www.aade.gr/sites/default/files/2026-01/FAQs_eidiko_kathestos_mikrwn_epixeir.pdf
- S20 AADE cross-border SME scheme: http://www.aade.gr/diasynoriako-eidiko-kathestos-mikron-epiheiriseon
- S20b European Commission SME VAT explanatory notes: https://sme-vat-rules.ec.europa.eu/system/files/2024-10/sme-explanatory-notes_en.pdf
- S21 myDATA API documentation v1.0.12: https://www.aade.gr/sites/default/files/2025-11/myDATA%20API%20Documentation%20v1.0.12_official_erp.pdf
- S22 AADE myDATA FAQ (2023): https://www.aade.gr/sites/default/files/2023-02/FAQs_myDATA_epixeirisiaka_themata.pdf
- S22b AADE FAQ on Α.1138/2020: https://www.aade.gr/sites/default/files/2021-04/FAQs_myDATA_a1138_2020.pdf
- S23 E-invoicing:
  - AADE Α.1128/2025: https://www.aade.gr/sites/default/files/2025-09/a1128_2025.pdf
  - AADE press release 30.09.2026: https://www.aade.gr/sites/default/files/2026-09/dt_30.09.2026.pdf
  - AADE e-invoicing FAQ: http://www.aade.gr/ypohreotiki-ilektroniki-timologisi-psifiaka-parastatika-diakinisis-syhnes-erotiseis
- S24 European Commission explanatory notes 2015: https://taxation-customs.ec.europa.eu/document/download/928ee4c0-df62-4f1f-abc5-b2153e41e447_en?filename=explanatory_notes_2015_en.pdf
- S35 AADE, POS–cash-register link: http://aade.gr/diasyndesipos
  - Α.1155/2023: https://www.aade.gr/sites/default/files/2023-10/a_1155ada.pdf
- S36 HMRC: https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers

**Payment providers**
- S26 Paddle pricing: https://www.paddle.com/pricing
- S27 Paddle, legal relationship: https://www.paddle.com/help/start/intro-to-paddle/the-legal-relationship-between-paddle-and-you
- S27b Paddle, invoicing for payouts: https://www.paddle.com/help/manage/get-paid/do-i-need-to-invoice-paddle-for-my-payout
- S27c Paddle, when and how you get paid: https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
- S28 Paddle, prohibited products: https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- S28b Paddle verification:
  - https://www.paddle.com/help/start/account-verification/what-is-business-verification
  - https://www.paddle.com/help/start/account-verification/what-is-identity-verification
  - https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
- S29 Stripe Greece pricing: https://stripe.com/en-gr/pricing
- S29b Stripe Greece: https://stripe.com/en-gr/global
  - Selling without a separate entity: https://support.stripe.com/questions/selling-on-stripe-without-a-separate-business-entity (summary only)
- S29c Stripe payouts: https://docs.stripe.com/payouts
- S30 Stripe Managed Payments:
  - https://stripe.com/en-gr/managed-payments
  - https://docs.stripe.com/payments/managed-payments/eligibility
  - https://docs.stripe.com/payments/managed-payments/how-it-works
- S31 Lemon Squeezy:
  - https://www.lemonsqueezy.com/pricing
  - https://docs.lemonsqueezy.com/help/getting-started/fees
  - https://www.lemonsqueezy.com/blog/2026-update
  - https://docs.lemonsqueezy.com/help/getting-started/supported-countries
  - https://docs.lemonsqueezy.com/help/getting-started/getting-paid
  - https://docs.lemonsqueezy.com/help/getting-started/prohibited-products
- S32 FastSpring:
  - https://fastspring.com/pricing/
  - https://developer.fastspring.com/docs/set-up-your-payout-account
  - https://developer.fastspring.com/docs/receive-payouts
- S33 Stripe, ePOS registry compliance in Greece (summary only): https://support.stripe.com/questions/epos-registry-compliance-in-greece

**App stores**
- S37 Apple Small Business Program: https://developer.apple.com/app-store/small-business-program/
- S38 Apple Developer Program License Agreement, Schedule 2 and Exhibit A: https://developer.apple.com/support/terms/apple-developer-program-license-agreement/
- S39 Apple, apps in the EU: https://developer.apple.com/support/apps-in-the-eu/
- S40 Apple, program enrollment: https://developer.apple.com/help/account/membership/program-enrollment/
- S41 Google Play service fees: https://support.google.com/googleplay/android-developer/answer/112622
- S42 Google Play fee rollout: https://support.google.com/googleplay/android-developer/answer/16954621
- S43 Google Play alternative billing (EEA): https://support.google.com/googleplay/android-developer/answer/12348241
- S44 Google Play external offers: https://support.google.com/googleplay/android-developer/answer/14372887
- S45 Google Play tax rates and VAT: https://support.google.com/googleplay/android-developer/answer/138000
- S46 Google Play registration: https://support.google.com/googleplay/android-developer/answer/6112435
- S47 Google Play account types and health apps:
  - https://support.google.com/googleplay/android-developer/answer/13634885
  - https://support.google.com/googleplay/android-developer/answer/13996367
- S48 Google Play testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- S49 Apple DSA trader requirements: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/
- S50 Google Play developer details: https://support.google.com/googleplay/android-developer/answer/13628312

## Open gaps (UNVERIFIED)

- Whether online card payments (Stripe) fall under Greece's ePOS / POS–cash-register linking rules (S33, S35).
- Current myDATA rules for e-shop B2C receipts, including whether they can be aggregated.
- myDATA treatment of MoR and app-store payouts. The only AADE guidance found does not cover them.
- Current chamber subscription fees.
- Processing times for: Route B έναρξη; Apple enrolment and trader verification; Paddle and Stripe KYC.
- Whether new sellers are still onboarded by Lemon Squeezy and by Stripe Managed Payments.
- FastSpring rates and its acceptable-use policy.
- Whether a fitness app needs a Google Play organisation account.
- Whether Stamina is an ESS, if any human coaching is included.
