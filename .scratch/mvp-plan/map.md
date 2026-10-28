# Stamina MVP plan

Labels: wayfinder:map

## Destination

`docs/mvp-plan.md`: a decision-complete MVP plan (10 role sections, 8-week roadmap, tech-stack table, top 5 risks, decisions marked [Vang] / [External]) with nothing left to decide before Week 1 of the build. Building the MVP is beyond this map: hand off to `/to-spec` → `/to-tickets` → `/implement`.

## Notes

- **Domain**: a coaching product that generates and adapts a Program across four Pillars (Training, Nutrition, Mobility & Recovery, Daily Routine) from goals, sport, equipment, schedule, Check-ins and Logs. Use the vocabulary in `GLOSSARY.md`.
- **Skills**: grilling tickets call `grilling` + `domain-modeling`; research tickets `research`; prototype tickets `prototype`.
- **Hard constraints on every decision**: live with real users in ≤ 8 weeks; Vang part-time (~15 h/week) + AI coding agents; €0 / free tiers until traction, and every service names its first paid threshold; scales to worldwide users without a rewrite (multi-region, i18n, metric/imperial, time zones); not a medical device (screening, disclaimers, red-flag rules, GDPR for health data); prefer Vue 3 + TypeScript unless there's a strong reason not to.
- **Standing preferences**: MVP sport scope is padel + general strength; launch locales EN + EL with metric and imperial units; safety rules and nutrition logic are reviewed by a licensed professional before real users; decisions in the final document are marked [Vang] (made by Vang during grilling) or [External] (needs a third party, with needed-by week).
- **Execution override**: the final ticket, Write docs/mvp-plan.md, produces the deliverable document inside this map. Everything else produces decisions, not deliverables.
- **Research findings** live on local `research/<name>` branches (no remote until Install gh and move the repo and map to GitHub resolves); each research ticket points at its branch and file.

## Decisions so far

## Not yet specified

- **Food data source**: whether a food composition database is needed, and which (Open Food Facts, USDA FDC, Greek tables), hangs on the Nutrition depth chosen.
- **API and auth details**: API style (platform-generated vs custom), auth providers (email, Apple, Google) and session model, once the backend platform is chosen.
- **Design system specifics** beyond the basics in the core-screens prototype, once the component base is chosen.
- **Payments and legal entity**: payment provider, VAT/OSS handling, and whether a company must exist before charging, once monetization is decided.
- **Analytics and consent tooling**: privacy-friendly product analytics and how it fits health-data consent, once metrics and GDPR obligations are known.
- **Product name and brand**: replacing the `stamina` codename, once the first user and positioning are settled.
- **Multi-region mechanics**: data residency per region, read replicas, routing, once DB and cloud choices exist.
- **Notifications and reminders**: channels (web push, local, email) and cadence, once the delivery platform is chosen.
- **Exercise library localisation**: translating exercise content into Greek and future locales, once the library source is chosen.

## Out of scope

- **Building the MVP**: this map ends at a decision-complete plan; the build hands off to `/to-spec`.
- **Kite module**: MVP sport scope is padel + general strength; kite returns as a separate effort.
- **Apple Health / Google Fit / wearables integrations**: not in the MVP build; the frontend platform decision must only keep the path open.
- **Locales beyond EN + EL**: i18n infrastructure is in scope, extra translations are not.
