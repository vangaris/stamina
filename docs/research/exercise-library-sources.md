# Exercise library sources: licensing and media

Ticket: `.scratch/mvp-plan/issues/11-exercise-library-sources.md`. All sources accessed 2026-10-28.

## Answer

- **wger** is the only free source checked that is open, has structured data and images, and supports commercial use. It has 939 exercises (EN 939, **EL 48**), 383 images and 78 videos. Exercise data is CC-BY-SA 4.0 (781), CC-BY-SA 3.0 (132) or CC0 (26), and images are CC-BY-SA 3.0/4.0. That means **attribution plus share-alike**: anything adapted from wger, including Greek translations, must be released under CC-BY-SA.
- **free-exercise-db (yuhonas)** has 876 exercises with images, EN only, and is released under the **Unlicense** (public domain: no attribution or share-alike). It is the richest free schema checked (level, force, mechanic, category, equipment, muscles, step instructions). **Media provenance is unverified**: it is derived from wrkout/exercises.json, whose README does not say where the images came from. Treat the images as a legal risk until that is cleared.
- **ExerciseDB** is now two offerings. (a) **exercisedb.io**: a one-time licence for 1,394 exercises with animated GIFs. Starter costs **$199**. Pro costs **$599** and adds difficulty, movement taxonomy, substitutions and progressions. Commercial use and self-hosting are allowed; redistributing the raw files is not. No language other than EN is advertised. (b) **ExerciseDB API v2** (GitHub, AGPL code) claims 11,000+ exercises; its pricing and ToS could not be fetched (**unverified**).
- **API Ninjas**: 3,000+ exercises, EN. The **free tier is non-commercial only and does not allow caching**. Commercial use and storing data start at the **Business plan, $149/mo** ($99/mo billed yearly). Images are Premium-only. It is not suitable as a library seed at €0.
- **No source** provides Greek coverage beyond wger's 48 translations, padel drills, RIR/RPE suitability, contraindication or injury tags, mobility/recovery protocols with dosage, or Pillar mapping. Stamina would have to author these itself.
- **Trade-off:** wger (open, but share-alike on derived data and media) vs. free-exercise-db (no strings, but unclear image provenance) vs. exercisedb.io ($199–599 one-time, clean commercial licence, EN only). A common pattern is to use one source's taxonomy and author your own media and Greek text, so share-alike doesn't reach Stamina's own content. Whether CC-BY-SA reaches Stamina's own content depends on whether that content is an "Adapted Material" ([INFERENCE]; legal review needed).

## Comparison

| Source | Licence (data) | Commercial | Attribution | Share-alike | # exercises | EN / EL | Media & licence | Cost |
|---|---|---|---|---|---|---|---|---|
| wger | CC-BY-SA 4.0 (781), CC-BY-SA 3.0 (132), CC0 (26) per exercise [1][2] | Yes | Yes (per-exercise `license_author`) | Yes (BY-SA) | 939 [1] | 939 / 48 [3] | 383 images (CC-BY-SA 4.0: 295, 3.0: 88); 78 videos; images on 279 exercises, videos on 46 [4] | Free API/dump; server code AGPL-3.0 [5] |
| free-exercise-db (yuhonas) | Unlicense (public domain) [6][7] | Yes | No | No | 876 [8] | EN only | 2 JPGs per exercise (start/end); provenance via wrkout/exercises.json **not documented** [9] | Free |
| exercisedb.io (EDB Exercise Intelligence) | Proprietary, perpetual, non-exclusive, non-transferable [10][11] | Yes | Not stated | n/a | 1,394 [12] | EN (no other language advertised) | Animated GIFs: Starter 180/360 px; Pro adds 720/1080 px; limited-use licence, no standalone redistribution [10][13] | $199 Starter / $599 Pro, one-time; updates not included [11] |
| ExerciseDB API v2 (exercisedb.dev, RapidAPI) | Code AGPL-3.0 [14]; data ToS **unverified** | Unverified | Unverified | Unverified | "11,000+" claimed [15] | Unverified | Claims 15,000+ videos, 20,000+ images, 5,000+ GIFs [15] | **Unverified** (pricing link blocked: HTTP 429/403) |
| API Ninjas Exercises | Proprietary ToS [16] | Paid plans only; free = personal/eval [16][17] | Free tier only | n/a | "3000+" [18] | EN | Images "Premium only" [18] | Free (3k calls/mo, non-commercial, no caching); Developer $59 ($39/yr), commercial but **no caching**; Business $149 ($99/yr) commercial + caching [17] |
| wrkout.xyz | Commercial (mentioned in wrkout README) | Claimed | – | – | "2,500+" claimed | – | "10,000+ images, 3,500+ videos" claimed [9] | **Unverified** (site not checked) |

## Fields per source

| Field | wger | free-exercise-db | exercisedb.io | API Ninjas |
|---|---|---|---|---|
| Primary/secondary muscles | Yes [1] | Yes [8] | Targets + secondary [10] | Primary only [18] |
| Equipment | Yes | Yes | Yes | Yes (array) |
| Category / type | Category | category, force, mechanic | Pro only: category | type |
| Movement pattern | No (variation_group only) | Partial (force/mechanic) | Pro: "movement taxonomy" [10] | No |
| Difficulty | No | `level` | Pro only [10] | Yes |
| Instructions | Free-text description per translation | Step array | Instructions + descriptions | Text + `safety_info` |
| Substitutions/progressions | Variation groups | No | Pro: 5,462 substitutions, 435 progression/regression links [12] | No |
| Media | Images/videos (partial coverage) | 2 JPGs | GIFs | Images (premium) |
| Greek | 48 | No | No | No |

## Gaps no source covers (Stamina must author)

- Greek names and instructions at scale (wger has 48 of 939).
- Padel-specific drills and on-court footwork, plus mapping to padel demands.
- Suitability for RIR/RPE prescription (e.g. whether an exercise is safe to take close to failure), and load-progression rules.
- Contraindication and injury tags (e.g. shoulder impingement, lower back), plus regressions linked to Check-in soreness.
- Mobility & Recovery protocols with dosage (holds, durations), and Daily Routine items.
- Pillar mapping, time cost and set-up, home vs. gym vs. court location tags.
- Consistent movement-pattern taxonomy (hinge/squat/push/pull/carry/rotate/anti-rotate). The only one found is exercisedb.io Pro (paid).

## Sources (all accessed 2026-10-28)

1. wger API `exerciseinfo` (count, per-exercise licence counts computed): https://wger.de/api/v2/exerciseinfo/?limit=1000
2. wger licence list: https://wger.de/api/v2/license/
3. wger translations by language (EN id / EL id): https://wger.de/api/v2/exercise-translation/?language=2 , https://wger.de/api/v2/language/
4. wger images and videos: https://wger.de/api/v2/exerciseimage/?limit=1000 , https://wger.de/api/v2/video/
5. wger code licence: https://github.com/wger-project/wger/blob/master/LICENSE.txt
6. free-exercise-db licence (GitHub API: Unlicense): https://api.github.com/repos/yuhonas/free-exercise-db
7. free-exercise-db README: https://github.com/yuhonas/free-exercise-db
8. free-exercise-db dataset: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
9. wrkout/exercises.json README: https://github.com/wrkout/exercises.json
10. exercisedb.io terms: https://exercisedb.io/terms
11. exercisedb.io pricing: https://exercisedb.io/pricing
12. exercisedb.io home: https://exercisedb.io/
13. exercisedb.io FAQ: https://exercisedb.io/faq
14. ExerciseDB API licence: https://github.com/ExerciseDB/exercisedb-api/blob/main/LICENSE
15. ExerciseDB API README: https://github.com/ExerciseDB/exercisedb-api
16. API Ninjas terms §3.1: https://api-ninjas.com/terms
17. API Ninjas pricing: https://api-ninjas.com/pricing
18. API Ninjas Exercises API: https://api-ninjas.com/api/exercises
