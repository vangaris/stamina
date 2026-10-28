# 19: Reminders and iOS install guide

**What to build:** Users get one daily Check-in reminder at the time they choose, by push when the app is installed or by email otherwise, and iOS users are guided to install the app.

**Blocked by:** 13: Check-in and stop flags

**Status:** ready-for-agent

**Roadmap week:** 6

- [ ] Reminder time setting; delivered at the user's local time (time zone aware)
- [ ] Web push (VAPID) when installed and permitted; Brevo email otherwise; reminder permission asked after the first Check-in
- [ ] Scheduled sender via Deno Deploy cron if available, else a GitHub Actions schedule calling an internal endpoint
- [ ] iOS users see a one-screen Add-to-Home-Screen guide after the reveal; the app requests persistent storage
- [ ] API tests cover local-time scheduling across time zones and channel choice
