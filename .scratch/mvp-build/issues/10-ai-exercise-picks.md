# 10: AI exercise picks

**What to build:** Exercise choices are made by the AI from the rules-filtered candidates, safely and cheaply, with automatic fallback to the rules picker and every call accounted for.

**Blocked by:** 09: Program generation with rules only, plus the reveal

**Status:** ready-for-agent

**Roadmap week:** 4

- [ ] One AI provider interface; Anthropic Claude Haiku adapter written and tested against its API shape (switched on at launch: Phase A production runs the existing "unavailable" provider, so Sessions use the rules picker and no Anthropic key or card is needed); deterministic fake in tests
- [ ] Prompt contains only slot spec, candidate and recent exercise IDs, sport, Goal, equipment: never user ID, age, sex, weight, Check-ins, Screening or stop flags (API test inspects the outgoing prompt via the fake)
- [ ] Validators: strict schema, IDs ⊆ candidates, correct count per slot, no duplicates; failure → 1 retry → rules picker
- [ ] Every call logged with purpose, model, tokens, cost and pseudonymous user; per-user cap 15 calls/day; global kill switch at 80 % of the monthly cap falls back to rules
- [ ] Session stores model and prompt_version; stored picks are never regenerated
- [ ] 'Suggested by AI' label on AI-picked exercises
- [ ] Evaluation set skeleton (EN + EL cases) runs in CI when prompts change and reports the validator pass rate
