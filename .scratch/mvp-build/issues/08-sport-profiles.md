# 08: Sport Profiles and sport requests

**What to build:** Each launch sport has an approved Sport Profile the engine plans around, and a user whose sport isn't listed gets a beta plan from an AI-drafted profile that Vang approves before anyone else sees it.

**Blocked by:** 05: Onboarding: who you are and how you play

**Status:** ready-for-agent

**Roadmap week:** 3

- [ ] Sport Profile structure: energy mix, key movements, high-load body areas, typical Activity, recovery window, season, METs per intensity, sources, status, version
- [ ] Admin script (run locally by Vang) drafts profiles with cited sources; 11 launch profiles approved via the database table editor
- [ ] 'Other…' request creates a draft profile; the requester's Program uses it labelled beta; other users only see approved profiles
- [ ] Copy rule enforced in review: no injury-prevention or medical claims in profiles
- [ ] API tests cover draft visibility (requester only) and approval making it visible to all
