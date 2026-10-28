# LLM options for plan generation: free tiers, cost, health-data terms

Type: research
Status: resolved

## Question

Which LLM APIs could help generate or explain Programs at €0 until traction: Google Gemini API free tier, Groq, Mistral (La Plateforme free tier), OpenRouter free models, Cloudflare Workers AI, OpenAI and Anthropic (no free tier, but cheapest models). For each: free limits (RPM/RPD/tokens), whether free-tier inputs are used for training, EU data residency / processing location, DPA availability, suitability for sending special-category health data, structured-output (JSON schema) support, and cost per generated 12-week Program at an assumed token budget (state the assumption). Also: what safety controls the providers offer (moderation endpoints, system-prompt guarantees). Cite official pricing, terms and docs.

## Answer

Gemini free tier is barred for EEA/UK-facing apps; only Groq free and Cloudflare Workers AI are €0 without training on inputs (~2–9 Programs/day). Paid models ≈ $0.01–0.02 per Program; most DPAs exclude health data.

Full findings: `docs/research/llm-options.md` on branch `research/llm-options` (commit `71caa8b`).

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
