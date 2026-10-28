# Exercise library sources: licensing and media

Type: research
Status: resolved

## Question

What open or licensable exercise datasets could seed Stamina's exercise library: wger (data + images), free-exercise-db (yuhonas), ExerciseDB (RapidAPI), API Ninjas, and others? For each: licence (commercial use, attribution, share-alike), number of exercises, fields available (muscles, equipment, movement pattern, difficulty, instructions, media), media licensing (images/GIFs/video), languages available (need EN + EL), and cost. Output a comparison and the fields Stamina's library would need that no source provides (e.g. padel-specific drills, RIR suitability, contraindication tags).

## Answer

wger is the only free, commercial-OK source with media (CC-BY-SA, share-alike; 48/939 Greek); free-exercise-db is public domain but image provenance unclear; exercisedb.io $199/$599 one-time; API Ninjas free tier non-commercial.

Full findings: `docs/research/exercise-library-sources.md` on branch `research/exercise-library-sources` (commit `966b59c`).

- **wger** is the only free source checked that is open, has structured data and images, and supports commercial use. It has 939 exercises (EN 939, **EL 48**), 383 images and 78 videos. Exercise data is CC-BY-SA 4.0 (781), CC-BY-SA 3.0 (132) or CC0 (26), and images are CC-BY-SA 3.0/4.0. That means **attribution plus share-alike**: anything adapted from wger, including Greek translations, must be released under CC-BY-SA.
- **free-exercise-db (yuhonas)** has 876 exercises with images, EN only, and is released under the **Unlicense** (public domain: no attribution or share-alike). It is the richest free schema checked (level, force, mechanic, category, equipment, muscles, step instructions). **Media provenance is unverified**: it is derived from wrkout/exercises.json, whose README does not say where the images came from. Treat the images as a legal risk until that is cleared.
- **ExerciseDB** is now two offerings. (a) **exercisedb.io**: a one-time licence for 1,394 exercises with animated GIFs. Starter costs **$199**. Pro costs **$599** and adds difficulty, movement taxonomy, substitutions and progressions. Commercial use and self-hosting are allowed; redistributing the raw files is not. No language other than EN is advertised. (b) **ExerciseDB API v2** (GitHub, AGPL code) claims 11,000+ exercises; its pricing and ToS could not be fetched (**unverified**).
- **API Ninjas**: 3,000+ exercises, EN. The **free tier is non-commercial only and does not allow caching**. Commercial use and storing data start at the **Business plan, $149/mo** ($99/mo billed yearly). Images are Premium-only. It is not suitable as a library seed at €0.
- **No source** provides Greek coverage beyond wger's 48 translations, padel drills, RIR/RPE suitability, contraindication or injury tags, mobility/recovery protocols with dosage, or Pillar mapping. Stamina would have to author these itself.
- **Trade-off:** wger (open, but share-alike on derived data and media) vs. free-exercise-db (no strings, but unclear image provenance) vs. exercisedb.io ($199–599 one-time, clean commercial licence, EN only). A common pattern is to use one source's taxonomy and author your own media and Greek text, so share-alike doesn't reach Stamina's own content. Whether CC-BY-SA reaches Stamina's own content depends on whether that content is an "Adapted Material" ([INFERENCE]; legal review needed).
