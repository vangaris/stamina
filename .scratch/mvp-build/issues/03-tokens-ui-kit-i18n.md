# 03: Theme tokens, core UI kit and i18n

**What to build:** Screens can be built from shared, themeable, accessible components in English and Greek: a placeholder theme (light + dark) drives every component through semantic tokens, and a dev-only page shows them all.

**Blocked by:** 01: Walking skeleton

**Status:** done

**Roadmap week:** 1

- [x] Token packages hold primitive and semantic tiers (DTCG JSON) and compile to CSS variables for light and dark; components reference semantic tokens only
- [x] One package each for button, chip, chip-group, stepper, checkbox, text-field, card, sheet, tabs, bottom-nav, progress-bar, toast
- [x] Each component has keyboard focus, correct ARIA roles (sheet traps focus), reduced-motion handling and ≥ 44 px tap targets; component tests + axe pass
- [x] Dev-only UI page renders every component in both themes and is excluded from production builds
- [x] vue-i18n with ICU messages in EN and EL; CI fails when any EN key lacks an EL value
- [x] Placeholder values match the plan: system font, type 12/14/16/20/24/32/48, spacing 4/8/12/16/24/32, radius 8/16/pill
