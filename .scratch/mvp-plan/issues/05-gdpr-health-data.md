# What does GDPR Article 9 require of a solo-founder health app?

Type: research
Status: resolved

## Question

Stamina will process health data (PAR-Q answers, injuries, sleep, soreness, RPE, body weight, possibly menstrual cycle) for users worldwide, run by a solo founder in Greece. Under GDPR (Art. 6, 9(2)(a) explicit consent, Art. 25, 30, 32, 35 DPIA, 37 DPO, 44+ transfers) and the Greek DPA (HDPA) guidance: what is mandatory before launch (consent design, DPIA, records of processing, DPO need, processor DPAs, EU hosting vs SCCs, breach procedure, data subject rights incl. export and deletion, retention, age limits)? Also: which non-EU regimes bite on a worldwide launch (US: FTC Health Breach Notification Rule, Washington My Health My Data Act, CCPA/CPRA; UK GDPR)? And what extra applies if health data is sent to an LLM provider? Output a pre-launch checklist with sources.

## Answer

All inputs are Art. 9 health data: separate explicit consent, mandatory DPIA (HDPA list) and Art. 30 records before launch; DPAs + transfer basis per processor incl. LLM; 72 h breach notice; Greek age 15; UK rep, WA MHMDA, FTC HBNR if targeted.

Full findings: `docs/research/gdpr-health-data.md` on branch `research/gdpr-health-data` (commit `27fbc43`).

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
