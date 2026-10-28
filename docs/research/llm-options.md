# LLM options for Program generation: free tiers, cost, health-data terms

Ticket: `.scratch/mvp-plan/issues/09-llm-options.md`. All sources were accessed on 2026-10-28. Prices are in USD as the providers publish them. Nothing has been converted to EUR.

## Answer

- **The Gemini free tier is ruled out by Google's own terms for an EU-facing app.** The terms say "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom." Unpaid inputs are used for training and can be read by human reviewers ("Do not submit sensitive … personal information"). The terms also forbid using the API "to provide medical advice" and forbid apps likely to be used by under-18s. [G2]
- **Truly €0 tiers that don't train on your data:** the **Groq** free plan and **Cloudflare Workers AI** (10,000 Neurons/day). At the token budget assumed below, that is roughly 2–9 Programs per day. Groq stores data in the US. Cloudflare does not support Regional Services for Workers AI. [Q1][Q3][C1][C2][C5]
  - **Mistral** free mode trains on your data by default (you can opt out), and its free limits are not published. [M2][M4]
  - **OpenRouter** `:free` models allow 50 requests/day (1,000/day after buying 10 credits). Only 1 of 16 free models is on the zero-data-retention (ZDR) list. [R1][R3]
- **Contractual EU-only inference** is available from three providers, each at extra cost or gating:
  - Mistral `api.eu.mistral.ai`, at 1.1× list price. [M5]
  - OpenAI `eu.api.openai.com`, which needs sales approval and a Modified Abuse Monitoring arrangement, at +10%. [O2]
  - OpenRouter EU routing, Business/Enterprise plans only. [R4]
  - Anthropic offers only `global` or `us`. [A3] Groq is US only. [Q3] Gemini paid data "may be stored transiently or cached in any country". [G2]
- **Health data:** four providers' standard DPAs say they don't expect special-category data:
  - Mistral and Anthropic list special categories as "None". [M6][A4]
  - OpenAI says "No sensitive data is intended to be transferred". [O4]
  - OpenRouter excludes "health information" unless separately agreed. [R5]
  - Groq's and Cloudflare's DPAs explicitly allow for special-category or health data. [Q4][C4]
- **Usage policies limit health or medical advice from all six vendors whose policies were checked** (Gemini, Groq, Mistral, OpenAI, Anthropic, and OpenRouter by passing through each model's terms). Anthropic requires a qualified human in the loop for "Medical" high-risk recommendations, effective 2026-11-12. Whether Stamina counts as "medical" depends on the medical-device boundary ticket. [G2][Q2][M7][O5][A5]
- **Cost per 12-week Program** (assumption: 30k input + 20k output tokens):
  - About $0.008–0.018 on the cheapest paid models: Groq gpt-oss-20b $0.0083, OpenAI gpt-5-nano $0.0095, Claude Haiku 5.5 $0.013, Mistral Small 4 on the EU endpoint $0.018.
  - Gemini 3.8 Flash is $0.098, rising to $0.195 on 2027-01-01.
- **Structured output:**
  - Schema-guaranteed (constrained decoding): OpenAI, Anthropic, Groq (`strict` on gpt-oss/Qwen).
  - JSON-Schema support: Gemini, Mistral.
  - Best-effort only: Cloudflare (a few older models) and OpenRouter (depends on the endpoint).
- **Free moderation endpoints:** OpenAI `omni-moderation` and Mistral Moderation 2. Mistral's includes a "Health" category that flags requests for tailored medical advice. No provider reviewed guarantees that the model follows the system prompt.

## Cost assumption (used for every cost figure)

One "12-week Program" = **30,000 input tokens + 20,000 output tokens**. For example, 4 calls (1 skeleton + 3 Blocks), each with about 7.5k tokens in (system prompt, profile, a slice of the exercise catalogue) and about 5k tokens out (structured JSON covering all four Pillars). This is an assumption and has not been measured. Reasoning or "thinking" tokens are billed as output on Gemini [G1]. With reasoning models, output can be much larger than 20k. Anthropic notes that Claude 4.7+ tokenizers produce about 30% more tokens for the same text [A1].

## 1. Free limits

| Provider | Free offer | Published limits | Programs/day at the assumption | Source |
|---|---|---|---|---|
| Google Gemini API | Free tier on some models (e.g. Gemini 3.8 Flash, 3.6 Flash, 3.5/3.1 Flash-Lite; **not** Gemini 4 Argon or 3.1 Pro) | Per-model RPM/TPM/RPD are **not published** on the docs page ("View your active rate limits in AI Studio"). RPD resets at midnight Pacific. Limits apply per project. | Unverified. Not usable for EEA users anyway (see §2). | [G1][G3] |
| Groq | Base (free) plan. The docs table is captioned as "base limits", with an "Upgrade to Developer plan" prompt. | gpt-oss-120b / gpt-oss-20b / qwen3.8-27b: **30 RPM, 1K RPD, 8K TPM, 200K TPD**. gpt-oss-safeguard-20b: 3 RPM, 2K TPM. | 200K TPD ÷ 50k ≈ **4/day**. 8K TPM is below one 12.5k-token call, so calls must be split smaller. | [Q1] |
| Mistral (Studio "Free mode") | Free API keys within "included monthly usage" | Limits shown only in the Admin Panel (tokens/min, requests/s per model). **Not published.** | Unverified | [M3] |
| OpenRouter | `:free` model variants (16 of 464 models listed on 2026-10-28) | **20 RPM; 50 RPD** if less than 10 credits ever purchased; **1,000 RPD** with at least 10 credits | 4 calls/Program → **12/day**, or **250/day** after a 10-credit purchase | [R1][R6] |
| Cloudflare Workers AI | 10,000 Neurons/day on Workers Free and Paid. Resets 00:00 UTC. | Text generation: 300 RPM (20 RPM for models that need Workers Paid) | gpt-oss-20b ≈ 1,091 Neurons → **~9/day**; gpt-oss-120b ≈ 2,318 → **~4/day**; llama-3.3-70b-fp8-fast ≈ 4,896 → **~2/day** | [C1][C3] |
| OpenAI | Lists a "Free" usage tier ("allowed geography", $100/month usage limit). The pricing page shows no free token allowance. | Per-model RPM/TPM shown only in console | Whether Free-tier usage is free of charge is **unverified** | [O1][O6] |
| Anthropic | No free token allowance on the pricing page. New orgs may start in a lower-limit "Evaluation" tier. | Tier caps (Start $500/mo …) | n/a, paid only | [A1][A6] |

## 2. Training, data location, DPA, health-data suitability

| Provider (tier) | Inputs used for training? | Retention / ZDR | Where processed / stored | DPA | Special-category (health) data | Use-policy limits on health advice |
|---|---|---|---|---|---|---|
| **Gemini – Unpaid** | **Yes**, "to provide, improve, and develop Google products…". Human reviewers may read inputs and outputs. | — | Not stated | No processor DPA for Unpaid | "Do not submit sensitive, confidential, or personal information to the Unpaid Services." **EEA/CH/UK: "You may use only Paid Services when making API Clients available to users"** there. | "You may not use the Services in clinical practice, to provide medical advice…". 18+ only, and no apps "likely to be accessed by individuals under the age of 18". [G2] |
| **Gemini – Paid** | No | Prompts logged "for a limited period" for abuse detection | "may be stored transiently or cached in any country in which Google or its agents maintain facilities". No EU-only option documented for the Developer API. | Google processor DPA (business.safety.google/processorterms) | Not addressed on the terms page. DPA wording not checked. | Same as above. [G2] |
| **Groq** (all plans) | No: "Groq is not permitted to use Inputs or Outputs for training… unless explicitly granted permission" | Not retained by default. Up to 30 days for reliability/abuse logs. Self-serve **ZDR toggle** for all customers. | **US** (GCP buckets in the US). SCCs for transfers. EEA customers contract with Groq UK Ltd. | Yes, incorporated into the Services Agreement. **Does not cover Beta/preview models** (e.g. qwen3.8-27b) unless stated otherwise. | DPA Annex: "may include sensitive personal data or special categories of personal data… as determined by Customer" | "should not be used for medical, legal, financial, or other professional advice". Liability cap $5,000 for free services. [Q2][Q3][Q4] |
| **Mistral – Free mode** | **Yes, by default** ("we may use your data (input and output) to train"). Opt-out available at any time. | ZDR available (help centre). Details not checked. | Global endpoint: "does not commit to a specific inference location". EU endpoint `api.eu.mistral.ai` (EU+EFTA data centres) at **1.1×**. Whether this applies on Free mode is unverified. | Yes. Mistral AI (Paris) is processor, but **controller for training unless opted out**. | DPA Exhibit 1: "Special categories of personal data: **None**" | Usage Policy bans "professional advice without proper qualification", including "medical diagnoses, treatment suggestions, or any form of health-related guidance". [M2][M5][M6][M7] |
| **Mistral – Pay-as-you-go** | Opt-out available ("Customers retain full control") | as above | as above | as above | as above | as above [M2] |
| **OpenRouter** | OpenRouter itself: no, unless you opt in (1% discount). Upstream providers vary per endpoint. A separate account setting covers free models. | ZDR routing enforceable per account, per guardrail or per request. Only **1 of 16 `:free` models** appears in the ZDR endpoint list (2026-10-28). | Global routing by default. **EU in-region routing only on Business/Enterprise plans.** | Yes (openrouter.ai/data-processing-agreement) | DPA §2.6: OpenRouter "will not be required to process any Sensitive Data" (which includes "health information") unless agreed in writing | Pass-through: customer must check each model's terms ("regulated, high-risk, sensitive" use is the customer's call). [R2][R3][R4][R5][R7] |
| **Cloudflare Workers AI** | No: "Cloudflare does not use Customer Content processed by Workers AI to train AI models" | **Zero data retention** for standard inference | Global network. DLS compatibility table marks Workers AI **✘ Regional Services**, so EU-only processing cannot be enforced. | Yes, Cloudflare DPA v6.4 covers Self-Serve | DPA explicitly lists health data among special categories that customer content "may include" | Third-party model licences/AUPs apply per model. [C2][C4][C5] |
| **OpenAI API** | No ("not used to train or improve OpenAI models (unless you explicitly opt in)") | Abuse logs 30 days. ZDR / Modified Abuse Monitoring by **sales approval**. | Global by default. **EU processing via `eu.api.openai.com`** after approval, with a Modified Retention amendment, at +10% for models released from 2026-03-05. | Yes. EEA customers contract with OpenAI Ireland Ltd. | DPA Schedule 1: "No sensitive data is intended to be transferred unless the user includes it unexpectedly" | Bans tools that give "tailored advice that requires a license, without appropriate involvement by a licensed professional", and "automation of high-stakes actions… medical… without human review" (effective 2026-11-20). [O2][O4][O5] |
| **Anthropic API** | "Retained data is never used for model training without your express permission" | No conversation content retained by default (except "Covered Models", 30 days). ZDR via sales. | `inference_geo`: **`global` or `us` only**. Workspace geo: `us` only. **No EU option.** | Yes. DPA is "incorporated into these Terms by reference". | DPA Schedule: "Special categories of personal data (if applicable): **None**" | AUP (effective 2026-11-12): "Medical" High-risk Area (diagnosis, treatment plans, interpreting symptoms) requires a **qualified human in the loop** plus disclosure. [A2][A3][A4][A5] |

## 3. Structured output (JSON Schema)

| Provider | Mechanism | Guarantee | Source |
|---|---|---|---|
| Gemini | `response_format` with JSON Schema. SDKs accept Pydantic/Zod. | "generate responses that adhere to a provided JSON Schema" | [G4] |
| Groq | `response_format.json_schema` with `strict: true` (constrained decoding) on gpt-oss-20b/120b, qwen3.8-27b, muse-spark-open. `strict: false` elsewhere. | Strict mode: "100% schema adherence". No streaming or tool use with Structured Outputs. | [Q5] |
| Mistral | Custom structured outputs (schema) or JSON mode. Mistral Small 4 lists "Structured Outputs". | Doc says custom is "more reliable"; no hard guarantee stated | [M8][M9] |
| OpenRouter | `response_format` json_schema, `strict` | Per endpoint: "exact compliance is not guaranteed on every endpoint". Use `require_parameters: true`. Of the `:free` models, 3 of 16 list `structured_outputs`. | [R6][R7] |
| Cloudflare Workers AI | JSON Mode (`json_schema`) on a short list (llama-3.3-70b-fp8-fast, llama-3.1-8b, etc.). **gpt-oss is not on the list.** | "can't guarantee that the model responds according to the requested JSON Schema". No streaming. | [C6] |
| OpenAI | Structured Outputs | "ensures the model will always generate responses that adhere to your supplied JSON Schema" | [O3] |
| Anthropic | `output_config.format` (JSON outputs) plus strict tool use. GA on Haiku 5.5 / 4.5 and others. | Constrains responses to the schema | [A7] |

## 4. Cost per 12-week Program (30k in / 20k out, standard tier, list price)

| Model | $/M in / out | $ per Program | $ per 1,000 Programs |
|---|---|---|---|
| Groq gpt-oss-20b | 0.075 / 0.30 | 0.0083 | 8.25 |
| OpenAI gpt-5-nano | 0.05 / 0.40 | 0.0095 | 9.50 |
| Cloudflare gpt-oss-20b (beyond free Neurons) | 0.20 / 0.30 | 0.0120 | 12.00 |
| OpenAI gpt-6-luna | 0.10 / 0.50 | 0.0130 | 13.00 |
| Anthropic Claude Haiku 5.5 (≤100k prompt) | 0.10 / 0.50 | 0.0130 | 13.00 |
| Groq gpt-oss-120b | 0.15 / 0.60 | 0.0165 | 16.50 |
| Mistral Small 4 (global) | 0.15 / 0.60 | 0.0165 | 16.50 |
| Mistral Small 4 (EU endpoint, ×1.1) | 0.165 / 0.66 | 0.0182 | 18.15 |
| Cloudflare gpt-oss-120b | 0.35 / 0.75 | 0.0255 | 25.50 |
| Gemini 3.1 Flash-Lite (paid) | 0.25 / 1.50 | 0.0375 | 37.50 |
| OpenAI gpt-5-mini | 0.25 / 2.00 | 0.0475 | 47.50 |
| Cloudflare llama-3.3-70b-fp8-fast (JSON-mode capable) | 0.293 / 2.253 | 0.0539 | 53.85 |
| Gemini 3.5 Flash-Lite (paid) | 0.30 / 2.50 | 0.0590 | 59.00 |
| Gemini 3.8 Flash (paid, to 2026-12-31) | 0.75 / 3.75 | 0.0975 | 97.50 |
| Groq qwen3.8-27b (preview, outside the DPA) | 0.80 / 4.00 | 0.1040 | 104.00 |
| Anthropic Claude Haiku 4.5 | 1.00 / 5.00 | 0.1300 | 130.00 |
| Gemini 3.8 Flash (paid, from 2027-01-01) | 1.50 / 7.50 | 0.1950 | 195.00 |
| Mistral Medium 3.5 | 1.50 / 7.50 | 0.1950 | 195.00 |

Batch APIs are about 50% cheaper on Gemini, OpenAI and Anthropic, and Mistral batch is −50% [G1][O1][A1][M1]. OpenAI EU residency adds 10% for eligible models released on or after 2026-03-05 [O1]. Gemini paid Tier 1 needs a linked billing account [G3]. Sources: [G1][Q6][M1][C1][O1][A1].

## 5. Safety controls

| Provider | Moderation / safety tooling | System-prompt guarantee |
|---|---|---|
| Gemini | Built-in adjustable safety filters (harassment, hate, sexually explicit, dangerous). Terms: "You are responsible for determining the necessary and appropriate safety settings". | None stated [G2][G5] |
| Groq | Hosts Llama Prompt Guard 2 (22M/86M, $0.03–0.04/M) and gpt-oss-safeguard-20b ($0.075/$0.30). Structured outputs give "programmatic refusal detection". | None stated [Q5][Q6] |
| Mistral | **Mistral Moderation 2 is free**. Categories include **Health** ("detailed or tailored medical advice"), Financial, Law, PII, self-harm, etc. | None stated [M1][M10] |
| OpenRouter | Guardrails (budgets, ZDR, data-region, model allow-lists). Moderation depends on the model. | None stated [R1][R2] |
| Cloudflare | `@cf/meta/llama-guard-3-8b` ($0.484/$0.030 per M) | None stated [C1] |
| OpenAI | **Moderation endpoint free** (`omni-moderation-latest`, text+image). Can also be requested inline with a generation. | None stated [O3b] |
| Anthropic | No dedicated moderation endpoint found. Docs give guides for content moderation with Claude, jailbreak mitigation and prompt-leak reduction. | None stated [A8] |

"System-prompt guarantee": none of the pages reviewed offers a contractual or documented guarantee that a model will follow the system prompt. Only the output *format* is guaranteed (§3). This is a negative finding from the pages listed. Not every page on each site was searched.

## Trade-offs these facts imply (no decision made)

- **€0 + EU users + health data** narrows the field to Groq free or Cloudflare free. Both offer no training and a DPA that accepts special categories. Both process outside the EU: Groq in the US, Cloudflare with no regional enforcement. Both cap throughput at single-digit Programs per day. On Groq free, the 8K TPM limit forces small calls.
- **EU-only inference** costs money (Mistral EU endpoint +10%, OpenAI EU after sales approval, OpenRouter Business). At about $0.02 per Program, 1,000 Programs cost about $18 on Mistral Small 4 EU.
- **Standard DPAs that say "special categories: None"** (Mistral, Anthropic, OpenAI, OpenRouter) mean that sending Check-in data (soreness, sleep, RPE) would sit outside the DPA as written. Two ways around this: minimise or pseudonymise what is sent to the LLM, or negotiate terms. Whether these Check-in fields are "health data" under GDPR Art. 9 belongs to the GDPR ticket.
- **All vendors limit "medical"/"health" advice.** Keeping generation clearly within fitness programming (not diagnosis, treatment or symptom interpretation) is what keeps the use inside their policies. See the medical-device boundary ticket.

## Unverified / not found

- Gemini free-tier RPM/RPD/TPM per model (published only inside AI Studio).
- Mistral free-mode numeric limits, and whether `api.eu.mistral.ai` is available on Free mode.
- Whether OpenAI's "Free" usage tier includes any free tokens.
- Google processor DPA wording on special categories (not opened).
- The training policy of each individual OpenRouter `:free` upstream (the models API returned no `data_policy` field; only ZDR-list membership was checked).
- Real token counts per Program (the cost assumption is not measured).

## Sources (all accessed 2026-10-28)

- [G1] Gemini Developer API pricing: https://ai.google.dev/gemini-api/docs/pricing
- [G2] Gemini API Additional Terms of Service (effective 2026-03-23): https://ai.google.dev/gemini-api/terms
- [G3] Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- [G4] Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- [G5] Gemini safety settings: https://ai.google.dev/gemini-api/docs/safety-settings
- [Q1] Groq rate limits: https://console.groq.com/docs/rate-limits
- [Q2] Groq Services Agreement (last modified 2026-06-22): https://console.groq.com/docs/legal/services-agreement
- [Q3] Your Data in GroqCloud: https://console.groq.com/docs/your-data
- [Q4] Groq Customer DPA (effective 2025-10-15): https://console.groq.com/docs/legal/customer-data-processing-addendum
- [Q5] Groq Structured Outputs: https://console.groq.com/docs/structured-outputs
- [Q6] Groq supported models & prices: https://console.groq.com/docs/models
- [M1] Mistral API pricing: https://docs.mistral.ai/inference/pricing
- [M2] Mistral: Do you use my user data to train…: https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models
- [M3] Mistral usage and limits: https://docs.mistral.ai/admin/billing-usage/usage-limits
- [M4] Mistral opt-out of training: https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training
- [M5] Mistral regional inference: https://docs.mistral.ai/inference/regional-inference
- [M6] Mistral DPA (effective 2026-07-27): https://legal.mistral.ai/terms/data-processing-addendum
- [M7] Mistral Usage Policy (effective 2026-06-11): https://legal.mistral.ai/terms/usage-policy
- [M8] Mistral structured outputs: https://docs.mistral.ai/studio/conversations/structured-output
- [M9] Mistral Small 4 model card: https://docs.mistral.ai/models/mistral-small-4-0-26-03
- [M10] Mistral moderation & guardrailing: https://docs.mistral.ai/studio/safety-moderation
- [R1] OpenRouter limits: https://openrouter.ai/docs/api-reference/limits
- [R2] OpenRouter data collection: https://openrouter.ai/docs/guides/privacy/data-collection.md
- [R3] OpenRouter ZDR + ZDR endpoint list: https://openrouter.ai/docs/guides/features/zdr.md, https://openrouter.ai/api/v1/endpoints/zdr
- [R4] OpenRouter provider logging / in-region routing: https://openrouter.ai/docs/guides/privacy/provider-logging.md, https://openrouter.ai/docs/guides/features/in-region-routing.md
- [R5] OpenRouter DPA: https://openrouter.ai/data-processing-agreement
- [R6] OpenRouter models API: https://openrouter.ai/api/v1/models
- [R7] OpenRouter structured outputs / terms: https://openrouter.ai/docs/guides/features/structured-outputs.md, https://openrouter.ai/terms
- [C1] Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- [C2] Workers AI data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- [C3] Workers AI limits: https://developers.cloudflare.com/workers-ai/platform/limits/
- [C4] Cloudflare DPA v6.4: https://www.cloudflare.com/cloudflare-customer-dpa/
- [C5] Data Localization Suite product compatibility: https://developers.cloudflare.com/data-localization/compatibility/
- [C6] Workers AI JSON Mode: https://developers.cloudflare.com/workers-ai/features/json-mode/
- [O1] OpenAI API pricing: https://developers.openai.com/api/docs/pricing
- [O2] OpenAI data controls / data residency: https://developers.openai.com/api/docs/guides/your-data
- [O3] OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- [O3b] OpenAI moderation: https://developers.openai.com/api/docs/guides/moderation
- [O4] OpenAI DPA (effective 2026-01-01): https://openai.com/policies/data-processing-addendum/
- [O5] OpenAI usage policies (effective 2026-11-20): https://openai.com/policies/usage-policies/
- [O6] OpenAI rate limits / usage tiers: https://developers.openai.com/api/docs/guides/rate-limits
- [A1] Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing
- [A2] Anthropic API and data retention: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- [A3] Anthropic data residency: https://platform.claude.com/docs/en/manage-claude/data-residency
- [A4] Anthropic DPA: https://www.anthropic.com/legal/data-processing-addendum; Commercial Terms: https://www.anthropic.com/legal/commercial-terms
- [A5] Anthropic Usage Policy (effective 2026-11-12): https://www.anthropic.com/legal/aup
- [A6] Anthropic rate limits: https://platform.claude.com/docs/en/api/rate-limits
- [A7] Anthropic structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- [A8] Anthropic content-moderation guide: https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation
