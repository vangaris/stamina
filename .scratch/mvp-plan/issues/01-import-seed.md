# Import Vang's coaching system into seed/

Type: task
Status: resolved

## Question

Vang's existing personal system (daily routine, 12-week periodized strength program, padel/kite training, mobility & isometrics, 4-meal nutrition plan, hydration/electrolyte protocol, recovery) is not on this machine. Copy it into `seed/` in this repo, in whatever form it exists (markdown, sheets exported to CSV, PDFs), with a `seed/README.md` listing each file and what it covers.

HITL: Vang supplies the path or the content; the agent copies, inventories and commits it. Resolved when `seed/` is committed; the answer records the inventory and any gaps (Pillars with no seed material).

## Comments

- 2026-10-28: Searched the whole home directory (Spotlight, EN + EL keywords). Only match: `~/Downloads/nutrition-lifestyle-guide.md`, imported to `seed/` with inventory in `seed/README.md`. Missing: 12-week periodized strength program, padel-specific training, mobility & isometrics, electrolyte protocol. Waiting on Vang for their location, or confirmation they don't exist in written form.
- 2026-10-28 (Vang): no further seed needed. The product must not encode any specific program; Vang's guide is an example only.

## Answer

`seed/` holds one file, `nutrition-lifestyle-guide.md` (Vang's Greek nutrition, supplement and daily-routine guide), inventoried in `seed/README.md`. It is **an example user, not a template**: no further import. Vang redirected the product in this session:

- **Sport-agnostic**: the user selects any sport (e.g. basketball) and what they need (training program, nutrition, or both); no hard-coded program such as CrossFit or padel.
- **AI suggests** Sessions and shows what to eat and drink.
- **Activities drive Adaptation as suggestions**: e.g. 2 basketball games this week → the app suggests changing Sessions or a Deload.
- **Health-app connection** (Apple Health / Health Connect) is wanted; moved from Out of scope into MVP scope per Pillar, including Nutrition depth to decide its phase against the €0 constraint.

Map updated: Notes (domain, standing preferences), Out of scope (kite module and health integrations removed), tickets 12, 14, 15, 17, 18, 19, 22, 23 reworded; `GLOSSARY.md` gains Activity and Deload, and Adaptation becomes a suggestion the user accepts or declines.
