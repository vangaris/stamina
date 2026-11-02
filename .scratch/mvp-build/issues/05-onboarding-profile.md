# 05: Onboarding: who you are and how you play

**What to build:** A new user with an invite code walks the first onboarding screens and their answers are saved: what they want, birth year and country (with the under-18 and non-EU/EEA stops before any consent or health question), sport and when they play, Goal and training week.

**Blocked by:** 04: Sign-in through app-core

**Status:** done

**Roadmap week:** 2–3

- [x] Invite code required to start; invalid or used codes are rejected
- [x] Screen 1 asks needs (training / food / both), birth year and country of residence; age < 18 shows 'Stamina is for adults' and stores nothing; non-EU/EEA shows the availability message and stores nothing
- [x] Sport chosen from the 11 launch sports or 'Other…'; play days or 'It varies'; usual duration and intensity; hot-conditions default for kite, windsurf and beach volleyball
- [x] Goal (four options) and training week (Sessions/week 2–4, length 30/45/60, available days ≥ Sessions/week) are validated
- [x] Locale and units pre-filled from the device and editable
- [x] API tests cover the under-18 and non-EEA rejections and profile persistence; Playwright covers the screens in EN

## Notes (closed 2026-11-02)

- Decisions with Vang: invite code, then sign in, then the screens; the invite is redeemed when the profile is first saved (a turned-away under-18 or non-EEA applicant does not burn it); EU/EEA decided on the server from the country code. Age is year-based (`currentYear - birthYear >= 18`).
- Invites are created with `invites:create` (see `docs/development.md`). "Open" means `redeemed_at is null`, so deleting the redeeming user does not reopen a code.
- Migration `0002_profile_and_invite.sql` was edited in place before merge; delete a local `apps/api/.pgdata` that applied the earlier version.
- Not done, for later tickets: `/start?code=` deep link (the code is typed); a throttle on the public `POST /invites/check` (guessing is impractical at 31^10 codes, but lookups are unlimited; ticket 23 hardening); editing a saved profile when no invite code is remembered (`SaveProfile` answers invite-invalid without calling the API).
