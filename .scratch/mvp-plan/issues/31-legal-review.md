# Legal review: lawyer or not, scope and timing

Type: grilling
Status: resolved

## Question

Research and decisions left legal calls that a solo founder should not make alone. Does Stamina engage a lawyer before the beta, for which questions, at what likely cost and by which build week, and what is done without one?

The calls:
- **DPIA sign-off**: mandatory before launch (GDPR research; HDPA list), covering the AI flow and screening data.
- **Privacy notice and Art. 30 records.**
- **Consent wording** for health data.
- **Terms of use** with the wellness / not-a-medical-device position.
- **wger CC-BY-SA** share-alike reach into Stamina's own content (only images are used, unmodified, with attribution).
- **Own-worded screening** vs licensed PAR-Q+/GAQ, if no licence arrives.
- **Anthropic DPA** + SCC transfer of pseudonymous non-health data.
- **The EU-only option**, if the DPIA requires it.

Output: lawyer yes/no, scope, rough budget, needed-by week, and which documents Vang drafts himself from templates.

## Comments

- 2026-10-28 round 1 (Vang accepted all recommendations Q1–Q6). Sources: GDPR research pre-launch checklist (17 items) and medical-device research.

## Answer

**Scope cut: EU/EEA-only beta.** Sign-up asks for country of residence and accepts EU/EEA only, stated in the terms of use. This keeps the UK GDPR representative, Washington MHMDA / Connecticut and the FTC Health Breach Notification Rule (checklist items 15–16) out of the MVP. They return with a non-EU market launch.

**[Vang] drafts with AI agents, by build week 4**

| Document | Checklist items | Built from |
|---|---|---|
| Data inventory + legal bases per purpose (Art. 6 contract + Art. 9(2)(a) explicit consent) | 1–2 | Data model, Safety rules, Generation engine |
| Explicit-consent wording + consent log | 3 | Onboarding, Data model |
| Privacy notice (retention, recipients, transfers, rights, withdrawal, AI disclosure) | 4, 13, 17 | Data model, Cloud setup, Generation engine |
| DPIA (health data, Screening, LLM flow, transfers, risks → mitigations) | 5 | Map decisions |
| Record of processing; DPO assessment ("not required at this scale; re-assess at 1,000 users") | 6–7 | Inventory |
| Processor register with DPA + transfer basis: Neon, Cloudflare, Deno Deploy, Brevo, Sentry, UptimeRobot, Anthropic | 8–9 | Cloud setup, research |
| Breach runbook: 72 h HDPA notice via its portal (taxisnet), user notice, breach register | 11 | GDPR research |
| Terms of use: wellness / not a medical device, 18+, EU/EEA residence, acceptable use, liability, deletion | n/a | Safety rules, Monetization |

Items 10 (security), 12 (rights), 13 (retention jobs) and 14 (age gate) are product features already in the plan.

**Lawyer: fixed-scope review in build weeks 5–6, fixes in week 7**
- **Who**: one Greek lawyer experienced in GDPR and health/tech; **[Vang]** gets 2 quotes for the fixed scope and picks on that experience. Amount unknown until quoted. **[External]** roadmap item.
- **Questions**:
  1. Does the DPIA hold, and does any residual risk require prior consultation with the HDPA (Art. 36)?
  2. Is the consent wording valid explicit consent under GDPR and Greek law 4624/2019?
  3. Is the Art. 6 / Art. 9 split per purpose right?
  4. Is the transfer to Anthropic (US) of pseudonymous non-health data under its DPA + SCCs + our transfer assessment sufficient?
  5. Do the terms of use hold under EU consumer law (liability limits, wellness disclaimer, 18+)?
  6. Copyright:
     - Does the own-worded screening (from ACSM's public logic) infringe PAR-Q+ or GAQ?
     - Do wger CC-BY-SA images used unmodified with attribution trigger share-alike for anything of ours?

**No medical-device regulatory consultant in the MVP.** Covered by the boundary research, copy rules, the never-advise list and the physio sign-off. Revisit before the store apps / paid launch (post-MVP increment 1).

**[Vang] admin by week 6**
- HDPA breach-portal access (taxisnet).
- Accept or sign the DPA of each processor.
- Anthropic data settings: default retention; ZDR only if self-serve.
- A privacy@ mailbox.

**Propagated**: Onboarding adds country of residence (EU/EEA only) to screen 1. The roadmap gets the drafting (week 4), lawyer (weeks 5–6) and admin (week 6) items.
