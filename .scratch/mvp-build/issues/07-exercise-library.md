# 07: Exercise library

**What to build:** The engine has a curated, licensed, bilingual exercise library to choose from: about 150 exercises with Stamina tags, images where licensed, and attribution.

**Blocked by:** 01: Walking skeleton

**Status:** done

**Roadmap week:** 3–4

- [x] ~150 exercises imported from free-exercise-db (public domain) with EN name and instructions
- [x] Images only from wger, unmodified, with per-image attribution stored and shown; no free-exercise-db images
- [x] Every exercise has tags: equipment, location (gym / home / court / beach), movement pattern, high-load body areas, Session slot, RIR-suitable, easier and harder variant
- [x] Tags drafted by agents and reviewed by Vang (review recorded in the PR)
- [x] EN/EL name and instruction fields exist (EL may be filled in the localisation ticket)
- [x] API query returns exercises filtered by equipment, location, slot and excluded areas; API tests prove an excluded area never appears

## Notes

- 153 exercises in `apps/api/src/exercises/data/*.json` (four group files), synced into the `exercise` table by `migrate()`. Review table for Vang: `docs/exercise-library-review.md` (regenerate with `pnpm --filter @stamina/api exercises:review`).
- Images: 24 of 153, all wger, hotlinked and unmodified, shown with author, licence and source link by `@stamina/ui-exercise-image`. 11 images were dropped after an audit (a manufacturer's copyrighted promo image, a watermarked third-party image, AI-looking images wger had not flagged, a wrong movement, and four whose image author could not be verified). wger's `is_ai_generated` flag is not reliable, so every image needs a human look in the review.
- Closed: Vang reviewed the tags and images (`docs/exercise-library-review.md`); the review is recorded in the PR.
- Known gaps for ticket 09: one carry exercise only; a bodyweight-only home user has no pull exercise in main-strength (`inverted-row` needs a barbell, pull-ups need a bar).
