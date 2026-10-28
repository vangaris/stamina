# Nutrition and hydration evidence (ticket 17)

Research for `.scratch/mvp-plan/issues/17-nutrition-hydration-logic.md`. Every source was accessed on 2026-10-28. Labels: **UNVERIFIED** means I could not confirm the claim against the primary text. **[INFERENCE]** marks my own reasoning, which no source states. This document makes no product decisions.

## Answer

- **Resting energy:** Mifflin-St Jeor 1990 gives REE (kcal/d) = 10·kg + 6.25·cm − 5·age + 5 for men, or the same with −161 for women. EFSA lists it among five equally valid REE equations for healthy European adults. The same paper also publishes two equations without a sex term: REE = 15.1·kg + 371 and REE = 19.7·FFM + 413. Using sex = 0.5 (the midpoint of the male and female versions) is [INFERENCE].
- **Daily energy:** EFSA uses TEE = REE × PAL, with PAL 1.4, 1.6, 1.8 and 2.0 for low active, moderately active, active and very active lifestyles. The sustainable range is 1.35–2.5. Exercise energy can come from 2024 Compendium METs (1 MET ≈ 1 kcal/kg/h). Padel, CrossFit and HYROX have no Compendium entry. No position stand gives a way to convert session-RPE × minutes into kcal.
- **Goal adjustments:** ACSM/AND/DC suggest cutting ~250–500 kcal/d and losing less than 1 % of body weight per week. ISSN says slower loss (0.5–1 %/wk) protects lean mass in leaner people. ISSN gives no fixed surplus for muscle gain.
- **Safety floor:** The IOC REDs 2023 statement keeps EA ≈45 kcal/kg FFM/d as "adequate" and ≤30 as low, but warns against using any single number as a clinical threshold. No source gives an absolute kcal floor for athletes. The IOC REDs CAT2 indicators supply the warning signs.
- **Protein:** 1.2–2.0 g/kg/d (ACSM/AND/DC) or 1.4–2.0 g/kg/d (ISSN), rising to about 2.3–3.1 g/kg FFM for lean resistance-trained people in a deficit. Per meal: 0.25–0.3 g/kg (20–40 g) every 3–5 h.
- **Carbohydrate:** 3–5, 5–7, 6–10 or 8–12 g/kg/d depending on training load. Before exercise: 1–4 g/kg, 1–4 h ahead. Fast refuelling: 1–1.2 g/kg/h for 4 h. **Fat:** EFSA 20–35 % of energy; ACSM/AND/DC advise against going below 20 % long term.
- **Hydration:** EFSA adequate total water intake is 2.5 L/d for men and 2.0 L/d for women, including water from food. Around exercise: 5–10 mL/kg 2–4 h before; keep losses under 2 % of body weight; afterwards drink 1.25–1.5 L per kg lost, with sodium. Drinking more than you sweat is the main cause of hyponatraemia.
- **Allergens:** Regulation (EU) 1169/2011 Annex II lists exactly 14 allergens (table in Q7).
- **Wellness framing:** All sources describe their numbers as general guidance for healthy or exercising adults. They point people to a dietitian for individual plans and say REDs diagnosis is clinical.

## Q1 Resting energy (REE)

| Item | Finding | Source | Status |
|---|---|---|---|
| Combined equation | REE = 9.99·weight + 6.25·height − 4.92·age + 166·sex − 161 (sex: male 1, female 0); R² 0.71 | [S1] | Verified (abstract) |
| Simplified, by sex | Male: 10·kg + 6.25·cm − 5·y + 5. Female: 10·kg + 6.25·cm − 5·y − 161 | [S1] | Verified (abstract) |
| Inputs and units | weight in kg, height in cm, age in years; output is kcal/day | [S1] | Verified |
| Derivation sample | 498 healthy adults (247 F, 251 M), aged 19–78; both normal-weight and obese; measured by indirect calorimetry. Harris-Benedict overestimated measured REE by 5 % | [S1] | Verified |
| Published equations without a sex term | REE = 19.7·FFM + 413 (R² 0.64); REE = 15.1·weight + 371 (R² 0.56) | [S1] | Verified |
| Sex not given: averaging | Setting sex = 0.5 in the combined equation gives a constant of −78, the midpoint of +5 and −161 | — | [INFERENCE]; no published sex-neutral version found |
| EU standing | EFSA treats Harris-Benedict, Schofield, Mifflin, Müller and Henry as equally valid for healthy European adults. For its own reference values EFSA used Henry (2005) | [S2] | Verified |
| Athlete guidance | ACSM/AND/DC: Cunningham or Harris-Benedict give a reasonable BMR estimate, multiplied by an activity factor. RMR may be about 10 % higher than BMR | [S3] | Verified |
| Age coverage gap | The sample started at age 19, so 18-year-olds are just outside it | [S1] | [INFERENCE] |

## Q2 Daily energy: PAL and exercise energy

| Item | Finding | Source | Status |
|---|---|---|---|
| Factorial model | TEE = REE × PAL, where PAL = TEE/REE over 24 h | [S2] | Verified |
| EFSA PAL values | 1.4 = low active (sedentary), 1.6 = moderately active, 1.8 = active, 2.0 = very active | [S2] | Verified |
| Observed PAL range | 1.35–2.5 for sustainable lifestyles. EFSA says matching a lifestyle to a PAL is only a "rough indication" | [S2] | Verified |
| Individual use | EFSA energy reference values are population averages and "of limited use for individuals" | [S2] | Verified |
| Example reference values (age 18–29, BMI 22) | Men 9.8 / 11.2 / 12.6 / 14.0 MJ/d at PAL 1.4 / 1.6 / 1.8 / 2.0; women 7.9 / 9.0 / 10.1 / 11.2 MJ/d (1 MJ = 238.83 kcal) | [S2] Table 1 | Verified |
| Athlete TEE structure | TEE = BMR + TEF + TEA, where TEA = planned exercise + spontaneous activity + NEAT. Exercise energy can be estimated from activity logs using activity codes and METs. US DRIs underestimate what athletes need | [S3] | Verified |
| MET definition | 1 MET = 3.5 mL O₂/kg/min ≈ 1.0 kcal/kg/h. Intensity bands: light 1.6–2.9, moderate 3.0–5.9, vigorous ≥6.0 | [S9] | Verified |
| Compendium limits | Intended for adults aged 19–59 without conditions that affect energy expenditure (a separate Older Adult Compendium covers 60+). It is "a starting point" and "does not reflect precise individual EE values". Team and water sports are hard to measure | [S9] | Verified |
| Avoiding double counting | PAL values above 1.4 already include exercise. Adding Compendium kcal on top of PAL 1.6–2.0 would count exercise twice | — | [INFERENCE] |
| Session-RPE | Foster 2001 validates session RPE × duration as a training-load score against heart-rate methods. It does not convert that score to kcal | [S12] | Verified |
| RPE→kcal conversion | None found in any position stand reviewed | — | [INFERENCE]: not found, which is not proof that none exists |

**Compendium METs for the listed sports** (2024 Adult Compendium, code shown) [S10]:

| Sport | MET values (code) | Notes |
|---|---|---|
| Padel | **No entry.** Closest entries: tennis doubles 4.5 (15685) or 6.0 (15680); paddleball casual 6.0 (15500) or competitive 10.0 (15490); racquetball general 7.0 (15530) or competitive 10.0 (15520) | Choice of proxy is [INFERENCE]. "Paddleball" is a different sport |
| Tennis | general/moderate 6.8 (15675); competitive 8.0 (15676); singles 8.0 (15690); doubles 4.5 (15685) or 6.0 (15680); hitting balls 5.0 (15695) | |
| Beach volleyball | beach, in sand 8.0 (15725); indoor competitive 6.0 (15711); non-competitive 3.0 (15720) | |
| Kitesurfing | "Windsurfing or kitesurfing, crossing trial" 11.0 (18385) is the only kitesurf entry | |
| Windsurfing | sailing/board sailing general 3.0 (18120); not pumping 5.0 (18380); crossing trial 11.0 (18385); competition, pumping 14.0 (18390) | |
| Basketball | game 8.0 (15040); general 7.5 (15055); non-game 6.0 (15050); drills/practice 9.3 (15072); shooting 5.0 (15070) | |
| 5-a-side football | futsal 7.8 (15195); soccer casual 7.0 (15610); competitive 9.5 (15605) | Using futsal for 5-a-side is [INFERENCE] |
| Running | jogging general 7.5 (12020); 4–4.2 mph (≈6.5 km/h) 6.5; 5.0–5.2 mph (≈8.2 km/h) 8.5; 6–6.3 mph (≈9.8 km/h) 9.3; 6.7 mph (≈10.8 km/h) 10.5; 7.5 mph (≈12.1 km/h) 11.8; 8 mph (≈12.9 km/h) 12.0; 9 mph (≈14.5 km/h) 13.0; 10 mph (≈16.1 km/h) 14.8; cross-country 9.3 (12140) | km/h converted by me |
| CrossFit | **No entry.** Closest entries: circuit with kettlebells, vigorous 7.5 (02040); HIIT moderate 7.0 (02210); HIIT vigorous 11.0 (02214); kettlebell swings 9.8 (02058); resistance training vigorous 6.0 (02050); rowing ergometer vigorous 7.3 (02070) | Choice of proxy is [INFERENCE] |
| HYROX | **No entry.** Closest entries: running at the relevant speed; ski ergometer 10.5–18.0 (02082/02084); rowing ergometer 7.3–14.0 (02070–02074); circuit vigorous 7.5 (02040) | Choice of proxy is [INFERENCE]. No sled entry exists |
| Calisthenics | vigorous 7.5 (02020); moderate 3.8 (02022); light 2.8 (02024); body-weight resistance, high intensity 6.5 (02057) | |

## Q3 Goal adjustments, energy availability and warning signs

| Item | Finding | Source | Status |
|---|---|---|---|
| Deficit size | For most athletes, cut energy intake by ~250–500 kcal/d from periodized needs while keeping or slightly raising expenditure. Progress shows over about 3–6 weeks | [S3] | Verified |
| Rate of loss | Fat-free mass and performance are better kept when weekly loss stays under 1 % of body weight. In a cited study, 0.7 %/wk beat 1.4 %/wk. A slow loss is preferred over a rapid one | [S3] | Verified |
| ISSN rate | The higher the starting body fat, the larger the deficit can be. Leaner people do better with slower loss. Helms et al. suggest 0.5–1.0 % of body weight per week | [S5] | Verified |
| Surplus | ISSN sets no kcal figure. Larger surpluses suit untrained people or those with high NEAT; smaller ones suit advanced trainees, who risk more fat gain. In one example, elite athletes eating +544 kcal/d for 12 weeks gained 1.7 kg lean mass vs 1.2 kg, but also 1.1 kg fat vs 0.2 kg | [S5] | Verified |
| Energy availability (EA) | EA = (energy intake − exercise energy) / FFM, in kcal/kg FFM/d | [S7], [S3] | Verified |
| EA zones | ≥45 high (for mass gain or growth); ~45 adequate (maintenance); 30–45 reduced (for body-mass or fat loss); ≤30 low, with health effects | [S7] | Verified |
| Limits of the 30 threshold | The 30 kcal/kg FFM figure comes from short lab studies in sedentary women and was meant as a guide, not a diagnosis. The IOC sees "risks in setting a definitive clinical threshold". Men may tolerate lower values (~9–25) | [S7] | Verified |
| Adaptable vs problematic LEA | Low EA runs on a continuum from benign, quickly reversible effects ("adaptable") to lasting harm ("problematic") | [S7] | Verified |
| Absolute kcal floor | No source gives one for athletes. ISSN defines low-energy diets as 800–1200 kcal/d and very-low-energy diets as 400–800 kcal/d, and says very-low-energy diets have "limited relevance to healthy and athletic populations" | [S5] | Verified (definitions); no floor found |
| Fat floor | Avoid fat below 20 % of energy as a chronic pattern | [S3] | Verified |
| Warning signs: severe or primary (REDs CAT2) | Primary amenorrhoea or ≥12 missed cycles; 3–11 missed cycles; low testosterone (lab test); history of bone stress injury; elevated EDE-Q score or a diagnosed eating disorder | [S7] Table 4 | Verified |
| Warning signs: secondary or emerging | Oligomenorrhoea (cycles >35 days apart); diagnosed depression or anxiety; low libido or fewer morning erections; dizziness on standing; resting heart rate <40; blood pressure <90/60; sleep disturbance; stress, mood changes or body dissatisfaction; exercise dependence; low BMI; GI symptoms; urinary incontinence (women); falling iron status | [S7] Table 4 | Verified |
| Performance signs | Lower endurance, more injuries, weaker training response, poorer judgment, coordination and concentration, irritability, depression, lower glycogen, lower strength | [S3] | Verified |
| Screening prompt | Which of these signs suit a self-reported "see a professional" prompt (menstrual changes, injury history, mood, sleep, dizziness, libido, fixation on body or exercise) versus lab-only markers | — | [INFERENCE] |

## Q4 Protein

| Item | Finding | Source | Status |
|---|---|---|---|
| Daily range (joint position) | 1.2–2.0 g/kg/d. Higher for short periods of intense training or reduced energy intake | [S3] | Verified |
| Daily range (ISSN) | 1.4–2.0 g/kg/d is enough for most exercising people and works as a minimum. More may be needed to keep fat-free mass while restricting energy | [S4] | Verified |
| In an energy deficit | ACSM/AND/DC: 2.0 g/kg/d or more, spread across the day. ISSN: 2.3–3.1 g/kg FFM for lean resistance-trained people. ISSN: >3.0 g/kg/d may improve body composition in resistance-trained people | [S3], [S5], [S4] | Verified |
| Dose per meal | ACSM/AND/DC: 0.25–0.3 g/kg (15–25 g) in early recovery; 0.3 g/kg after key sessions and every 3–5 h. Above 40 g not yet shown to add benefit. ISSN: 0.25 g/kg or 20–40 g; 0.25–0.40 g/kg per dose | [S3], [S4], [S6] | Verified |
| Spacing | Evenly every 3–4 h (ISSN) or 3–5 h (ACSM/AND/DC). Protein 0–2 h after exercise strongly raises muscle protein synthesis | [S4], [S6], [S3] | Verified |
| Leucine per dose | 700–3000 mg | [S4] | Verified |
| EU population baseline | Population reference intake 0.83 g/kg/d; average requirement 0.66. EFSA considers twice the PRI safe for adults and sets no upper limit | [S2] | Verified |

## Q5 Carbohydrate and fat

| Item | Finding | Source | Status |
|---|---|---|---|
| Daily carbohydrate by load | Light (low intensity or skill-based): 3–5 g/kg/d. Moderate (~1 h/d): 5–7. High (1–3 h/d moderate-to-high intensity): 6–10. Very high (>4–5 h/d): 8–12 | [S3] Table 1 | Verified |
| Fuelling before events | Events <90 min: 7–12 g/kg per 24 h. Carb loading for >90 min: 10–12 g/kg/24 h for 36–48 h | [S3] | Verified |
| Pre-exercise | 1–4 g/kg, 1–4 h before exercise lasting >60 min. Lower fat, fibre and protein if the gut is a concern | [S3] | Verified |
| During exercise | <45 min: not needed. 45–75 min: small amounts or a mouth rinse. 1–2.5 h: 30–60 g/h. >2.5–3 h: up to 90 g/h | [S3] | Verified |
| Recovery | <8 h between sessions: 1–1.2 g/kg/h for the first 4 h, then daily needs. ISSN: 1.2 g/kg/h, or 0.8 g/kg/h plus 0.2–0.4 g/kg/h protein | [S3], [S6] | Verified |
| ISSN daily | 5–12 g/kg/d is typical, with 8–10 g/kg/d for people training ≥70 % VO₂max for about 12 h/week or more. Percent-of-energy targets "have fallen out of favor" | [S6] | Verified |
| Fat minimum | Avoid fat below 20 % of energy as a chronic pattern; follow public-health guidance, with saturated fat under 10 % | [S3] | Verified |
| EFSA reference intakes | Fat 20–35 % of energy; carbohydrate 45–60 %. Adequate intakes: linoleic acid 4 %, ALA 0.5 %, EPA+DHA 250 mg/d, fibre 25 g/d. ~130 g/d carbohydrate covers the brain's glucose need | [S2] | Verified |
| Fat in g/kg | No g/kg fat minimum appears in these sources | — | [INFERENCE]: not found |

## Q6 Hydration and electrolytes

| Item | Finding | Source | Status |
|---|---|---|---|
| EFSA adequate total water intake | Men 2.5 L/d, women 2.0 L/d (95th percentiles 4.0 and 3.1 L). Includes drinking water, all beverages and water in food | [S2] | Verified |
| Conditions | These values assume moderate temperature and PAL 1.6. Extreme heat or exercise can cause losses of up to ~8 L/d, which must be replaced along with electrolytes | [S2] | Verified |
| Drinks vs food | ~80 % from drinking water and beverages, ~20 % from food | [S13], which cites the EFSA 2010 water opinion | Verified on the EC page. The EFSA original (doi:10.2903/j.efsa.2010.1459) returned HTTP 403 |
| Before exercise (2016) | 5–10 mL/kg in the 2–4 h before; aim for pale-yellow urine. Sodium helps the body keep the fluid | [S3] | Verified |
| Before exercise (2007) | ~5–7 mL/kg at least 4 h before. If no urine or dark urine, another ~3–5 mL/kg about 2 h before. Beverages with 20–50 mEq/L sodium, or salty snacks | [S8] | Verified (full-text copy) |
| During exercise | Keep body-weight loss under 2 %. Typical intake 0.4–0.8 L/h, tailored to the person. Weigh before and after (1 kg ≈ 1 L of sweat). Sweat rates range from 0.3 to 2.4 L/h | [S3], [S8] | Verified |
| Sodium during exercise | Take sodium if sweat rate is >1.2 L/h, sweat is salty, or exercise lasts >2 h. Sweat sodium averages ~50 mmol/L (~1 g/L) per [S3], or ~35 mEq/L (range 10–70) per [S8]. Sports drinks: ~20–30 mEq/L sodium, ~2–5 mEq/L potassium, ~5–10 % carbohydrate | [S3], [S8] | Verified |
| After exercise | Drink 1.25–1.5 L per kg of body weight lost (125–150 % of the deficit), with sodium, spread over time rather than in large gulps. ACSM 2007 says ~1.5 L/kg for rapid recovery | [S3], [S8] | Verified |
| Heat | Losing more than 2 % of body weight harms cognition and aerobic performance, especially in hot weather. Dehydration raises the risk of heat exhaustion and heat stroke. Predicted sweat rates are higher at 28 °C than at 18 °C | [S3], [S8] | Verified |
| Hyponatraemia | Plasma sodium <135 mmol/L; symptoms appear mainly below ~130. Drinking more than you sweat is the main cause. Recreational athletes and women are at higher risk. Symptoms: bloating, nausea, vomiting, headache, confusion, seizures. It needs prompt medical attention | [S3], [S8] | Verified |
| Kidney excretion limit | ~0.7–1.0 L/h. Drinking faster than this can cause water intoxication | [S2] | Verified |

## Q7 EU mandatory allergens (Regulation 1169/2011, Annex II)

| # | Annex II wording (exceptions summarized) | Status |
|---|---|---|
| 1 | Cereals containing gluten: wheat (such as spelt and khorasan wheat), rye, barley, oats or their hybridised strains, and products thereof. Exceptions: wheat-based glucose syrups and maltodextrins, barley glucose syrups, cereals for distillates | Verified [S11] |
| 2 | Crustaceans and products thereof | Verified [S11] |
| 3 | Eggs and products thereof | Verified [S11] |
| 4 | Fish and products thereof. Exceptions: fish gelatine as a vitamin carrier; fish gelatine or isinglass as a fining agent | Verified [S11] |
| 5 | Peanuts and products thereof | Verified [S11] |
| 6 | Soybeans and products thereof. Exceptions: fully refined soybean oil, natural tocopherols, phytosterols, plant stanol ester | Verified [S11] |
| 7 | Milk and products thereof (including lactose). Exceptions: whey for distillates, lactitol | Verified [S11] |
| 8 | Nuts: almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia/Queensland nuts, and products thereof (except nuts for distillates) | Verified [S11] |
| 9 | Celery and products thereof | Verified [S11] |
| 10 | Mustard and products thereof | Verified [S11] |
| 11 | Sesame seeds and products thereof | Verified [S11] |
| 12 | Sulphur dioxide and sulphites at more than 10 mg/kg or 10 mg/L as total SO₂ | Verified [S11] |
| 13 | Lupin and products thereof | Verified [S11] |
| 14 | Molluscs and products thereof | Verified [S11] |

Text checked: the consolidated version of 2018-01-01, which includes the Annex II wording from Commission Delegated Regulation (EU) No 78/2014. I did not confirm whether a later consolidation changed Annex II (**UNVERIFIED**).

## Q8 Wellness vs clinical framing in the sources

| Source | How it frames its guidance | Status |
|---|---|---|
| ACSM/AND/DC 2016 [S3] | "General recommendations" for "active adults and competitive athletes", to be adjusted by sports dietitians. "Athletes should be referred to a registered dietitian/nutritionist for a personalized nutrition plan." Single-micronutrient supplements are only for a clinically defined need | Verified |
| ISSN 2017 [S4][S5][S6] | Written for "healthy, exercising individuals/adults". The body-composition stand excludes studies "in clinical contexts – including disease treatment" | Verified |
| EFSA DRVs [S2] | Values are for "an otherwise healthy individual (or population)". Energy values are population averages, "of limited use for individuals" | Verified |
| Mifflin 1990 [S1] | Derived from "healthy individuals" | Verified |
| Compendium 2024 [S9] | For adults without conditions that affect energy expenditure. Not precise for individuals | Verified |
| IOC REDs 2023 [S7] | REDs diagnosis uses the clinician-led CAT2 tool (screening, then severity and risk, then diagnosis). Each indicator needs a non-LEA differential diagnosis. EA thresholds should not be used as clinical cut-offs | Verified |
| Reg. 1169/2011 Art. 7(3) [S11] | Food information "shall not attribute to any food the property of preventing, treating or curing a human disease". This binds food business operators; whether it applies to app copy is [INFERENCE] | Verified (text) |
| EU health claim on water [S13] | Authorised water-intake claims must state that "at least 2 litres of water, from all sources" should be drunk per day (Reg. 1924/2006 context) | Verified on the EC page; the claims register itself was not checked |
| EU MDR 2017/745 | Not reviewed. The EUR-Lex fetch was blocked by a WAF challenge | UNVERIFIED |

## Sources

All accessed 2026-10-28.

- [S1] Mifflin MD et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 1990;51(2):241–7. doi:10.1093/ajcn/51.2.241. https://pubmed.ncbi.nlm.nih.gov/2305711/ (abstract only).
- [S2] EFSA. Dietary Reference Values for nutrients: Summary report. EFSA supporting publication 2017:e15121. doi:10.2903/sp.efsa.2017.e15121. https://www.efsa.europa.eu/sites/default/files/2017_09_DRVs_summary_report.pdf. This summarizes the full opinions on energy (doi:10.2903/j.efsa.2013.3005), carbohydrates (doi:10.2903/j.efsa.2010.1462), fats (doi:10.2903/j.efsa.2010.1461), protein (doi:10.2903/j.efsa.2012.2557) and water (doi:10.2903/j.efsa.2010.1459). The full opinions returned HTTP 403 from Wiley.
- [S3] Thomas DT, Erdman KA, Burke LM. Nutrition and Athletic Performance: position of Dietitians of Canada, the Academy of Nutrition and Dietetics and the American College of Sports Medicine, 2016 (revised Dec 2016). Med Sci Sports Exerc 2016;48(3):543–68, doi:10.1249/MSS.0000000000000852; J Acad Nutr Diet 2016;116(3):501–28, doi:10.1016/j.jand.2015.12.006. Read from the co-author PDF: https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf
- [S4] Jäger R et al. ISSN Position Stand: protein and exercise. JISSN 2017;14:20. doi:10.1186/s12970-017-0177-8. https://link.springer.com/article/10.1186/s12970-017-0177-8
- [S5] Aragon AA et al. ISSN position stand: diets and body composition. JISSN 2017;14:16. doi:10.1186/s12970-017-0174-y. https://link.springer.com/article/10.1186/s12970-017-0174-y
- [S6] Kerksick CM et al. ISSN position stand: nutrient timing. JISSN 2017;14:33. doi:10.1186/s12970-017-0189-4. https://link.springer.com/article/10.1186/s12970-017-0189-4
- [S7] Mountjoy M et al. 2023 IOC consensus statement on Relative Energy Deficiency in Sport (REDs). Br J Sports Med 2023;57(17):1073–97. doi:10.1136/bjsports-2023-106994. Read from the IOC-hosted PDF (bjsm.bmj.com blocked): https://stillmed.olympics.com/media/Documents/Athletes/Medical-Scientific/Consensus-Statements/REDs/BJSM-IOC-consensus-statement-on-Relative-Energy-Deficiency-in-Sport-REDs.pdf
- [S8] ACSM; Sawka MN et al. Exercise and fluid replacement. Med Sci Sports Exerc 2007;39(2):377–90. doi:10.1249/mss.0b013e31802ca597. Abstract: https://pubmed.ncbi.nlm.nih.gov/17277604/. Full text read from a reproduced copy, because the publisher site is paywalled: https://fics.sport/wp-content/uploads/2021/01/ICSC09_Section-1_READ_Exercise-and-Fluid-Replacement.pdf
- [S9] Herrmann SD et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci 2024;13(1):6–12. doi:10.1016/j.jshs.2023.10.010. https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/
- [S10] 2024 Adult Compendium activity list (PDF). https://pacompendium.com/wp-content/uploads/2025/02/1_2024-adult-compendium_1_2024.pdf
- [S11] Regulation (EU) No 1169/2011, consolidated text of 2018-01-01, Art. 7 and Annex II. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02011R1169-20180101
- [S12] Foster C et al. A new approach to monitoring exercise training. J Strength Cond Res 2001;15(1):109–15. https://pubmed.ncbi.nlm.nih.gov/11708692/
- [S13] European Commission, Knowledge4Policy, Health Promotion Knowledge Gateway, "Water" (cites EFSA 2010). https://knowledge4policy.ec.europa.eu/health-promotion-knowledge-gateway/water_en
