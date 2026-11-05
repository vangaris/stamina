# 08: Sport Profiles and sport requests

**What to build:** Each launch sport has an approved Sport Profile the engine plans around, and a user whose sport isn't listed gets a beta plan from an AI-drafted profile that Vang approves before anyone else sees it.

**Blocked by:** 05: Onboarding: who you are and how you play

**Status:** done

**Roadmap week:** 3

- [x] Sport Profile structure: energy mix, key movements, high-load body areas, typical Activity, recovery window, season, METs per intensity, sources, status, version
- [x] Admin script (run locally by Vang) drafts profiles with cited sources; 11 launch profiles approved via the database table editor
- [x] 'Other…' request creates a draft profile; the requester's Program uses it labelled beta; other users only see approved profiles
- [x] Copy rule enforced in review: no injury-prevention or medical claims in profiles
- [x] API tests cover draft visibility (requester only) and approval making it visible to all

## Notes

- Stacked on ticket 07 (migration 0005 follows 0004). 11 launch profiles are research-drafted from open sources with per-sport notes in `docs/sport-profiles/`; they seed as `draft` rows and become visible only when Vang approves each in the table editor (`docs/sport-profile-review.md` has the checklist and the SQL).
- Closed: Vang approved the 11 launch profiles and reviewed them against the checklist, including the no-medical-claims rule. The `sports:draft` script is written and exits with a clear message until an AI provider exists; its first real run (drafting a requested sport) moved to ticket 10 as an acceptance box.
- A sport request is capped at 5 per user (`SP001` -> 422 `too-many-sport-requests`); typing a launch sport under "Other" while it is still a draft creates nothing and exposes nothing.
