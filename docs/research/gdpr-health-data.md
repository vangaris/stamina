# What does GDPR Article 9 require of a solo-founder health app?

Ticket: `.scratch/mvp-plan/issues/05-gdpr-health-data.md`. All sources accessed 2026-10-28. Not legal advice; this file surfaces facts and the trade-offs they imply, it makes no product decisions.

## Answer

- **Stamina's inputs are health data.** PAR-Q answers, injuries, soreness, sleep, body weight and menstrual cycle all count as "data concerning health" (Art. 4(15), Recital 35, WP29 2015 annex). That annex says questionnaires used to give health advice are health data "regardless of the input". Art. 9 therefore applies to every user worldwide, because the controller is established in Greece (Art. 3(1)).
- **The realistic Art. 9 condition is explicit consent (9(2)(a)).** It has to sit on top of an Art. 6 basis (contract or consent). It must be a separate, express, granular statement that is as easy to withdraw as to give and that can be proved later. A standard checkbox inside the T&Cs does not count.
- **DPIA is mandatory before launch.** The HDPA's Art. 35(4) list makes a DPIA compulsory for "systematic … profiling … concerning health" (criterion 1.1). It also names "mhealth applications" and "artificial intelligence applications" (3.1).
- **Records of processing (Art. 30) are mandatory.** The under-250-employees exemption does not apply when special-category data is processed.
- **A DPO is required only for "large scale" core processing of health data (Art. 37(1)(c)).** No numeric threshold exists. WP243 treats a single physician as not large scale and a hospital as large scale, and lists "monitoring of wellness, fitness and health data via wearable devices" as systematic monitoring. Whether a DPO is needed at launch scale is a judgement call that must be documented and revisited as the user base grows.
- **Other pre-launch must-haves:**
  - Art. 28 DPAs with every processor.
  - An Art. 44+ transfer basis for any non-EEA processor: EU-US DPF certification or SCCs 2021/914 plus a transfer impact assessment. The DPF was upheld on 3 Sept 2025 (T-553/23); the appeal C-703/25 P is pending.
  - A 72-hour breach procedure. The HDPA portal uses taxisnet login.
  - User rights handled within one month, including machine-readable export (Art. 20) and erasure on consent withdrawal (Art. 17(1)(b)).
  - A defined and disclosed retention period (Art. 5(1)(e), 13(2)(a)).
  - Age floor: under-15s in Greece need parental consent (L.4624/2019 Art. 21). Other Member States set 13–16.
- **Outside the EU:**
  - **UK GDPR** applies if Stamina targets UK users, and requires a UK Art. 27 representative.
  - **FTC Health Breach Notification Rule** (16 CFR 318) explicitly covers fitness and sleep apps that draw data from multiple sources. A breach includes unauthorised disclosure.
  - **Washington MHMDA** has no revenue threshold. It requires opt-in consent to collect, a separate consent to share, a homepage health-privacy-policy link and 45-day deletion, and it carries a private right of action.
  - **Connecticut** consumer-health-data rules also have no threshold.
  - **CCPA** applies only above $26.625M revenue or 100k California consumers bought/sold/shared.
- **Sending health data to an LLM provider adds four requirements:**
  - The provider is a processor, so an Art. 28 DPA and a transfer mechanism are needed.
  - The consent and notice must name the disclosure.
  - The DPIA must cover the LLM processing.
  - Vendor defaults matter. For example, OpenAI keeps abuse-monitoring logs for 30 days, and Zero Data Retention or EU residency require approval. AI Act Art. 50 transparency obligations have applied since 2 Aug 2026.

## 1. Is Stamina's data "health data"?

| Fact | Source |
|---|---|
| "'data concerning health' means personal data related to the physical or mental health of a natural person … which reveal information about his or her health status" | GDPR Art. 4(15) [S1] |
| Health data covers "past, current or future physical or mental health status" | GDPR Recital 35 [S1] |
| Data from "online questionnaires with the purpose of providing health advice" are health data "regardless of the input the data subject provides" → PAR-Q answers qualify | WP29 annex on health data in apps and devices (2015) [S2] |
| Raw data become health data when they can be used, alone or combined, to draw conclusions about health status or risk. The annex's example is an app combining "sleep and exercise habits, … diet, weight, body mass index … mood diary" | WP29 annex [S2] |
| Processing of health data is prohibited unless an Art. 9(2) condition applies. 9(2)(a) is "explicit consent … for one or more specified purposes" | GDPR Art. 9 [S1] |
| GDPR applies to processing "in the context of the activities of an establishment of a controller … in the Union, regardless of whether the processing takes place in the Union or not". A Greek controller is therefore covered for users worldwide | GDPR Art. 3(1) [S1] |

**Implication.** Every core Stamina input (Check-in sleep, soreness and RPE; PAR-Q; injuries; weight; cycle) is special-category data, or becomes special-category data once combined into a Program. The WP29 annex was written under Directive 95/46. The EDPB has not withdrawn it, but it predates the GDPR. [INFERENCE: it is still the reference text on the scope of health data in lifestyle apps.]

## 2. Legal basis and consent design

| Requirement | Detail | Source |
|---|---|---|
| Need both an Art. 6 basis and an Art. 9 condition | "you must identify both a lawful basis under Article 6 and a condition … under Article 9" (ICO, UK GDPR, same structure as the EU GDPR) | [S12] |
| Greek domestic Art. 9 derogations do not obviously fit | L.4624/2019 Art. 22 allows special-category processing for social security, "preventive medicine … medical diagnosis, the provision of health or social care … or pursuant to a contract with a health professional", or public-health interest. [INFERENCE: a non-clinical coaching app run by a non-health-professional does not fit, which leaves 9(2)(a)] | [S4] |
| "Explicit" means an express statement | "the data subject must give an express statement of consent". Online, this can be done by "filling in an electronic form". Example 17: Yes/No boxes with text such as "I, hereby, consent to the processing of my data". Wording such as "It is clear to me that my data will be processed" does not qualify | EDPB Guidelines 05/2020 ¶91–96 [S5] |
| Withdrawal | Users can withdraw at any time, it must be "as easy to withdraw as to give consent", and users must be told about this before consenting | GDPR Art. 7(3) [S1] |
| Conditionality | When assessing whether consent is free, "utmost account" is taken of whether a contract is made conditional on consent | GDPR Art. 7(4) [S1] |
| Proof | The controller must be able to demonstrate consent (Art. 7(1)), which in practice means a consent log with timestamp, version and text shown | GDPR Art. 7 [S1] |
| Notice content | Retention period, rights, right to withdraw consent, recipients and transfers | GDPR Art. 13 [S1] |

**Trade-offs surfaced.**
- **Conditionality.** Stamina cannot generate a Program without health inputs, so health-data consent is close to a condition of the service. Art. 7(4) applies scrutiny to that. One option is to keep strictly necessary health inputs under one explicit-consent purpose and put optional ones (menstrual cycle, LLM processing, analytics or research) under separate, refusable toggles. Refusing an optional toggle would degrade features without blocking the app.
- **Granularity.** Each extra purpose is another toggle, another consent record and another withdrawal path to build.

## 3. Governance obligations before launch

| Obligation | Mandatory for Stamina? | Evidence |
|---|---|---|
| **DPIA (Art. 35)** | **Yes.** The HDPA list makes a DPIA compulsory when any 1st- or 2nd-category criterion is met. Criterion 1.1 is "Systematic evaluation, scoring, prediction … profiling, especially of aspects concerning the data subject's … health". Criterion 3.1 (with a 1st/2nd-category type) explicitly names "mhealth applications … from which user profiles are generated (e.g. daily habits), or artificial intelligence applications". Criterion 2.1 (large-scale special categories) may also apply as the app grows | HDPA DPIA list, 16-10-2018 [S6]; Art. 35(3)(b) [S1] |
| Prior consultation (Art. 36) | Only if the DPIA shows high residual risk after mitigation | GDPR Art. 36(1) [S1] |
| **Records of processing (Art. 30)** | **Yes.** The fewer-than-250-employees exemption does not apply where "the processing includes special categories of data" | GDPR Art. 30(5) [S1] |
| **DPO (Art. 37)** | **Depends on scale.** Required where core activities "consist of processing on a large scale of special categories". WP243 factors: number of data subjects, volume, duration, geography. "Processing of patient data by an individual physician" is not large scale; a hospital is. WP243 lists "monitoring of wellness, fitness and health data via wearable devices" as regular and systematic monitoring. There is no numeric threshold | GDPR Art. 37(1)(c) [S1]; WP243 [S7]; HDPA list uses the same factors [S6] |
| EU representative (Art. 27) | **No.** It applies only to controllers not established in the EU. [INFERENCE: a founder operating from Greece as a sole trader or company is established there] | GDPR Art. 27 [S1] |
| Privacy by design and default (Art. 25) | Yes. The DPIA should show minimisation, pseudonymisation and defaults | GDPR Art. 25 [S1] |
| Security (Art. 32) | Yes. "pseudonymisation and encryption", resilience, restore capability, and regular testing | GDPR Art. 32(1) [S1]; HDPA encryption guidance [S8] |
| **Processor contracts (Art. 28)** | **Yes, with every processor** (hosting, DB, auth, email, analytics, LLM). Must be "a contract … binding on the processor" setting out subject-matter, duration, nature, purpose, data types, and instructions | GDPR Art. 28(3) [S1] |
| Fines context | Breaches of Arts 5, 6, 7, 9, rights (12–22) and transfers (44–49) can be fined up to €20M or 4% of turnover | GDPR Art. 83(5) [S1] |

## 4. Hosting location and international transfers

| Option | Requirement | Source |
|---|---|---|
| EU/EEA hosting, EU-established processor | No Chapter V transfer. Art. 28 DPA still required | GDPR Art. 44–46 [S1] |
| US processor certified under EU-US Data Privacy Framework | Transfer is covered by the adequacy decision (2023/1795); "no specific authorisation" needed | Art. 45 [S1]; [S9] |
| DPF legal status | General Court dismissed the annulment action on 3 Sept 2025 (T-553/23). Appeal C-703/25 P lodged 31 Oct 2025 and shown as **pending** on InfoCuria | [S9], [S10] |
| Non-certified US or other third-country processor | SCCs (Commission Decision 2021/914) per Art. 46(2)(c), plus a transfer assessment and supplementary measures per EDPB Recommendations 01/2020 | Art. 46 [S1]; [S11] |
| Explicit consent to transfer (Art. 49(1)(a)) | EDPB notes WP29's position that consent is "inappropriate" for transfers that are periodic or ongoing, so it is not a basis for routine hosting | EDPB 05/2020 fn 47 [S5] |

**Trade-off.**
- **EU hosting with EU processors** removes the transfer analysis entirely.
- **A US free-tier provider** works if it is DPF-certified (check the DPF list per vendor; not checked here) or signs SCCs. The DPF route carries litigation risk while C-703/25 P is pending. A CJEU annulment would force a switch to SCCs.

## 5. Breach procedure

| Step | Requirement | Source |
|---|---|---|
| Notify supervisory authority | Without undue delay and "where feasible, not later than 72 hours after having become aware", unless the breach is unlikely to result in risk. Late notices need reasons | GDPR Art. 33(1) [S1] |
| Processor → controller | Processor notifies the controller "without undue delay", so this must be written into each DPA | GDPR Art. 33(2) [S1] |
| Notify users | If the breach is "likely to result in a high risk", notify users without undue delay, in clear and plain language | GDPR Art. 34 [S1] |
| Breach register | Document all breaches, including those not notified | GDPR Art. 33(5) [S1] |
| HDPA channel | Online portal "using the taxisnet credentials available to controllers established in Greece". English is accepted for cross-border processing. Email `databreach@dpa.gr` (optionally GPG-encrypted) only for controllers that cannot use taxisnet | HDPA breach page [S13] |
| US parallel (if applicable) | FTC HBNR: notify individuals ≤ 60 calendar days after discovery. Notify the FTC at the same time if ≥ 500 people are affected, or in an annual log if fewer | 16 CFR 318.4 [S15] |

## 6. Data subject rights, retention, age

| Topic | Requirement | Source |
|---|---|---|
| Response time | "without undue delay and in any event within one month", extendable by 2 months with notice. If a request is made electronically, answer electronically where possible | GDPR Art. 12(3) [S1] |
| Export | Portability in a "structured, commonly used and machine-readable format" when processing is based on consent or contract and automated. Both apply to Stamina | GDPR Art. 20(1) [S1] |
| Deletion | Erase without undue delay, including when the user "withdraws consent on which the processing is based according to … point (a) of Article 9(2)" and no other basis exists | GDPR Art. 17(1)(b) [S1] |
| Retention | Personal data kept "for no longer than is necessary". The period or the criteria for setting it must be disclosed. The GDPR fixes no number | GDPR Art. 5(1)(e), 13(2)(a) [S1] |
| Automated decisions | Users have the right not to be subject to solely automated decisions with legal or "similarly significant" effects. [INFERENCE: a training-load Adaptation is unlikely to be "similarly significant", but this belongs in the DPIA] | GDPR Art. 22 [S1] |
| Age (Greece) | Consent-based information society services: lawful from age 15. Under 15, the legal representative must consent | L.4624/2019 Art. 21 [S4] |
| Age (EU default and variance) | GDPR default is 16, Member States may lower it to 13. A cross-border controller "cannot always rely on complying with only the law of the Member State in which it has its main establishment". Expect "reasonable efforts to verify" age | GDPR Art. 8 [S1]; EDPB 05/2020 ¶131–134 [S5] |

**Trade-off.**
- **Single 16+ floor.** Satisfies every EU Member State's age of digital consent [INFERENCE from Art. 8's 13–16 range] and avoids building a parental-consent flow.
- **15+ (Greek floor).** Widens the Greek audience, but requires per-country age logic for other Member States.

## 7. Non-EU regimes on a worldwide launch

| Regime | Does it bite on Stamina? | Key obligations | Source |
|---|---|---|---|
| **UK GDPR** | Yes, if Stamina offers services to people physically in the UK. "This includes organisations in the EEA" | Appoint a UK representative (exempt only for occasional, low-risk processing, which health data is not). Same Art. 6 + Art. 9 structure | ICO territorial scope [S14]; ICO special category [S12] |
| **FTC Health Breach Notification Rule (16 CFR 318)** | Likely. A "vendor of personal health records" is a non-HIPAA entity offering a PHR. A PHR is a record with "the technical capacity to draw information from multiple sources". "Health care services or supplies" include any app that tracks "fitness, fertility, … sleep, … diet". [INFERENCE: user input plus device or API sync counts as multiple sources. FTC jurisdiction over a non-US company serving US users is not verified here] | A breach includes "unauthorized disclosure", not only hacks. Notify individuals within 60 days, plus the FTC and media for ≥ 500 residents of a state. Violations are treated as violations of an FTC trade-regulation rule and carry civil penalties | eCFR 16 CFR 318 (as amended 89 FR 47054, 2024) [S15] |
| **Washington My Health My Data Act (RCW 19.373)** | Yes, if Stamina targets WA consumers or collects data in WA. **No revenue threshold.** "Small businesses" are covered with the same obligations; only their compliance date differed (30 June 2024) | Consumer-health-data privacy policy linked separately on the homepage. Opt-in consent to collect for a specified purpose (unless necessary for the requested service). **Separate** consent to share. Consent cannot come from general T&Cs. Rights to access, withdraw and delete, with responses within 45 days. Processors need a binding contract (disclosure to a processor is not "sharing"). Access restriction. Enforced as a Consumer Protection Act violation, including **private action** | RCW 19.373.010–.090 [S16]; WA AG FAQ [S17] |
| **Connecticut (CGS 42-526)** | Yes, if Stamina targets CT residents. The consumer-health-data provisions apply notwithstanding the general applicability thresholds | Staff with access to consumer health data must be under confidentiality. Processors need compliant contracts (§42-521). No sale without consent. Geofencing ban | CGS ch. 743jj §42-526 [S18] |
| **Nevada (SB 370, NRS 603A)** | Probably similar to WA (consumer health data privacy policy; consent to collect or share). Thresholds and details **unverified**; the statute pages returned 403 | — | SB 370 bill title [S19] |
| **CCPA/CPRA** | **Not at launch.** Applies to for-profit businesses doing business in CA that meet one of: ≥ $26.625M revenue, buying/selling/sharing personal information of ≥ 100,000 CA residents or households, or ≥ 50% of revenue from selling or sharing | — | CPPA FAQ [S20] |

## 8. Extra requirements if health data goes to an LLM provider

| Requirement | Detail | Source |
|---|---|---|
| The provider is a processor → Art. 28 DPA | Anthropic's DPA incorporates SCCs Module 2/3 (Decision 2021/914) and the UK Addendum by reference. OpenAI's DPA was not reviewed here (**unverified**) | Anthropic DPA [S21]; GDPR Art. 28 [S1] |
| Transfer basis | US LLM APIs are Chapter V transfers unless processed in the EEA: DPF certification (vendor-specific, **not checked**) or SCCs + transfer assessment | §4 above |
| Retention and training defaults | OpenAI API: data "not used to train … unless you explicitly opt in". Abuse-monitoring logs, which can contain prompts and responses, are kept "for up to 30 days" by default. Zero Data Retention or Modified Abuse Monitoring need "prior approval". EU data residency needs approval for abuse-monitoring controls and a "Modified Retention amendment", and costs a 10% uplift on newer models | OpenAI data controls [S22] |
| Notice and consent | Recipients and transfers must appear in the privacy notice (Art. 13(1)(e)–(f)). [INFERENCE: if LLM processing is optional, a separate explicit-consent purpose keeps it refusable, see §2] | GDPR Art. 13 [S1] |
| DPIA scope | HDPA criterion 3.1 names "artificial intelligence applications". The DPIA must cover the LLM flow, minimisation and pseudonymisation of prompts, and provider retention | [S6]; EDPB-commissioned LLM risk report [S23] |
| US laws | MHMDA: disclosure to a processor under contract is not "sharing", but the processor contract requirements apply. CT §42-526(a)(1)(B) is the same idea | [S16], [S18] |
| EU AI Act Art. 50 | Transparency rules (for example, telling users they are interacting with an AI system) apply from **2 Aug 2026**, already in force at Stamina's launch. The exact scope for Stamina's use is not analysed here | AI Act Service Desk timeline [S24] |

## 9. Pre-launch checklist

| # | Item | Legal hook | Mandatory? |
|---|---|---|---|
| 1 | Map every data field and purpose, and classify which fields are health data | Art. 4(15), 9; WP29 annex | Yes (precondition for 2–6) |
| 2 | Choose and document an Art. 6 basis (likely contract) plus the Art. 9(2)(a) condition per purpose | Art. 6, 9 | Yes |
| 3 | Explicit-consent screen: express "I consent…" wording, separate from T&Cs, granular per purpose, withdrawal in-app as easy as giving it, consent log (who, when, text version) | Art. 7, 9(2)(a); EDPB 05/2020 | Yes |
| 4 | Privacy notice (Art. 13 fields incl. retention, recipients, transfers, rights, withdrawal) | Art. 12–13 | Yes |
| 5 | DPIA completed and signed off before go-live. Consult HDPA if residual risk is high | Art. 35–36; HDPA list 1.1, 3.1 | Yes |
| 6 | Record of processing activities | Art. 30(5) | Yes |
| 7 | DPO assessment documented (likely not required at small scale; re-assess on growth) | Art. 37(1)(c); WP243 | Assessment yes; DPO depends on scale |
| 8 | Art. 28 DPAs with every processor, including the LLM provider; sub-processor list | Art. 28 | Yes |
| 9 | Transfer mechanism per non-EEA processor (DPF check or SCCs + transfer assessment), or EU-only hosting | Art. 44–46; EDPB Rec 01/2020 | Yes if any non-EEA processor |
| 10 | Security measures: encryption at rest and in transit, access control, backups and restore test | Art. 32 | Yes |
| 11 | Breach runbook: 72h HDPA (taxisnet access set up in advance), user notice, breach register, processor notice clauses. FTC HBNR 60-day path if US users | Art. 33–34; [S13]; 16 CFR 318 | Yes |
| 12 | Rights handling: access, rectification, erasure (incl. on withdrawal), JSON/CSV export, within one month | Art. 12, 15–20 | Yes |
| 13 | Retention schedule plus deletion jobs, disclosed in the notice | Art. 5(1)(e), 13(2)(a) | Yes |
| 14 | Age gate: ≥ 15 in Greece without parental consent; decide the policy for other Member States (13–16) | Art. 8; L.4624/2019 Art. 21 | Yes |
| 15 | If targeting the UK: UK representative appointed | UK GDPR Art. 27 | Yes if UK targeted |
| 16 | If targeting the US: WA MHMDA consumer-health-data privacy policy linked on the homepage, opt-in plus separate share consent, 45-day rights; CT confidentiality and processor contracts | RCW 19.373; CGS 42-526 | Yes if WA/CT targeted |
| 17 | LLM: provider DPA, retention/ZDR settings, region, prompt minimisation, AI Act Art. 50 disclosure | Art. 28, 44+; AI Act Art. 50 | Yes if LLM used |

## Unverified / not researched

- **ICO data protection fee.** Not verified whether it is owed by a controller with no UK establishment that targets UK users.
- **UK GDPR transfer status of UK→EEA flows** (UK adequacy regulations for the EEA) not verified. The Data (Use and Access) Act 2025 changes were not researched.
- **Nevada SB 370** thresholds and details not verified (leg.state.nv.us returned 403 or no text).
- **DPF certification status** of specific vendors (OpenAI, Anthropic, Supabase, Firebase, etc.) not checked on dataprivacyframework.gov.
- **OpenAI DPA text** not reviewed.
- **FTC HBNR jurisdiction** over a non-US (Greek) operator not verified.
- **Digital Omnibus (GDPR amendments, procedure 2025/0360(COD)).** Still in the legislative procedure as of Oct 2026 [S25]. Current GDPR text applies.
- **ePrivacy / cookie consent** (Greek L.3471/2006 Art. 4(5)) for any analytics SDKs is out of the ticket's scope and not researched.
- **Source of the GDPR text.** EUR-Lex blocked automated fetches. Article text was read from the gdpr-info.eu mirror and checked against the HDPA-hosted official PDF title. Canonical citation: Regulation (EU) 2016/679, https://eur-lex.europa.eu/eli/reg/2016/679/oj.

## Sources

All accessed 2026-10-28.

- [S1] Regulation (EU) 2016/679 (GDPR), canonical https://eur-lex.europa.eu/eli/reg/2016/679/oj. Article text read via https://gdpr-info.eu/art-9-gdpr/ (and art-3, 4, 5, 7, 8, 12, 13, 17, 20, 22, 25, 27, 28, 30, 32–37, 45, 46, 83; recitals/no-35). Official PDF hosted by HDPA: https://www.dpa.gr/sites/default/files/2019-10/celex_32016r0679_en_txt.pdf
- [S2] Article 29 WP, Annex – health data in apps and devices (5 Feb 2015): https://ec.europa.eu/justice/article-29/documentation/other-document/files/2015/20150205_letter_art29wp_ec_health_data_after_plenary_annex_en.pdf
- [S4] Law 4624/2019 (Greece), HDPA English translation, Arts 21–22: https://www.dpa.gr/sites/default/files/2020-08/LAW%204624_2019_EN_TRANSLATED%20BY%20THE%20HDPA.PDF
- [S5] EDPB Guidelines 05/2020 on consent v1.1, ¶91–96, ¶125–134: https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf
- [S6] HDPA, List of processing operations subject to DPIA (Art. 35(4)), Γ/ΕΞ/8189/16-10-2018: https://www.dpa.gr/sites/default/files/2020-12/article_35_dpia_list_en.pdf
- [S7] Article 29 WP, Guidelines on DPOs (WP243), §2.1.3–2.1.4: https://ec.europa.eu/information_society/newsroom/image/document/2016-51/wp243_en_40855.pdf (rev.01: https://ec.europa.eu/newsroom/article29/items/612048)
- [S8] HDPA, Encryption – Pseudonymization: https://www.dpa.gr/en/by-design/encryption-pseudonymization
- [S9] CJEU press release 106/25, Latombe v Commission T-553/23 (3 Sept 2025): https://curia.europa.eu/site/upload/docs/application/pdf/2025-09/cp250106en.pdf
- [S10] Appeal C-703/25 P (lodged 31 Oct 2025): https://juris.curia.europa.eu/juris/document/document.jsf?docid=307389&doclang=EN ; status "Pending": https://infocuria.curia.europa.eu/tabs/affair?lang=EN&publishedId=C-703%2F25%20P
- [S11] EDPB Recommendations 01/2020 on supplementary measures v2.0: https://www.edpb.europa.eu/system/files/documents/2021-06/edpb_recommendations_202001vo.2.0_supplementarymeasurestransferstools_en.pdf
- [S12] ICO, What are the rules on special category data?: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data
- [S13] HDPA, Submission of a data breach notification: https://www.dpa.gr/en/Organisations/Data_Breach_notification/Submission
- [S14] ICO, Territorial scope knowledge hub (UK representatives): https://ico.org.uk/media2/migrated/4031113/ic-327905-y2y5-knowledge-hub-territorial-scope.pdf
- [S15] 16 CFR Part 318, Health Breach Notification Rule (eCFR current): https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-318
- [S16] RCW 19.373 (Washington My Health My Data Act): https://app.leg.wa.gov/RCW/default.aspx?cite=19.373.010 (and .020, .030, .040, .050, .060, .090)
- [S17] Washington AG, MHMDA FAQ: https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy
- [S18] Connecticut General Statutes ch. 743jj, §42-526: https://www.cga.ct.gov/current/pub/chap_743jj.htm
- [S19] Nevada SB 370 (2023), enrolled: https://www.leg.state.nv.us/Session/82nd2023/Bills/SB/SB370_EN.pdf
- [S20] California Privacy Protection Agency FAQ: https://cppa.ca.gov/faq.html ; thresholds: https://cppa.ca.gov/regulations/cpi_adjustment.html
- [S21] Anthropic Data Processing Addendum: https://www.anthropic.com/legal/data-processing-addendum
- [S22] OpenAI, Data controls in the OpenAI platform: https://developers.openai.com/api/docs/guides/your-data
- [S23] EDPB Support Pool of Experts, AI Privacy Risks & Mitigations – LLMs (10 Apr 2025; not an EDPB position): https://www.edpb.europa.eu/documents/support-pool-of-experts/ai-privacy-risks-mitigations-large-language-models-llms_en
- [S24] AI Act Service Desk, implementation timeline: https://ai-act-service-desk.ec.europa.eu/en/ai-act/eu-ai-act-implementation-timeline
- [S25] European Parliament Legislative Observatory, 2025/0360(COD) Digital Omnibus: https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0360(COD)
