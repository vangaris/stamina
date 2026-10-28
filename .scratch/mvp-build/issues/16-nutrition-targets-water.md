# 16: Nutrition targets and water

**What to build:** A Nutrition user unlocks Meals by adding body stats and food preferences, then sees daily energy, macro and drink targets that change with the day type, logs water in a tap, and is protected by floors and a professional prompt.

**Blocked by:** 06: Consent, Screening and outcomes, 12: Activities and Load

**Status:** ready-for-agent

**Roadmap week:** 6

- [ ] 'Unlock Meals' inputs: height, weight, sex for the energy formula, everyday activity, eating pattern, 14 EU allergens, dislikes, meals per day, cooking effort
- [ ] Energy = Mifflin-St Jeor (midpoint for 'prefer not to say') × 1.4 / 1.5 / 1.7 + (MET − 1) × kg × hours per Session or Activity; day types rest / Session / Activity / hard Activity
- [ ] Goal adjustment: fat loss −400 kcal never on hard-Activity days; muscle gain +250; floor = resting energy; > 1 %/week loss for 2 weeks halves the deficit with a reason; firing twice shows the dietitian/doctor prompt
- [ ] Protein 1.6 g/kg (2.0 when losing fat); carbs 3/4/5/6–7 g/kg by day type; fat ≥ 20 %
- [ ] Drinks 2.0 / 1.6 / 1.8 L + 0.5 L per training hour + 0.25 L/h hot, capped at 1 L per hour of exercise with 'drink to thirst'; pre-Activity cue; electrolyte note for > 2 h or hot
- [ ] +250 / +500 ml water logging; REDs warning-signs card in Meals and Settings → Safety
- [ ] Nutrition off for 9b users; recalculation on ≥ 2 kg weight change or Goal/schedule change
- [ ] API tests cover targets per day type, floor, rate check and cap with fixture users
