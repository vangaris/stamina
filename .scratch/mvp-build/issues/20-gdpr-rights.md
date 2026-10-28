# 20: GDPR rights

**What to build:** Users can take all their data with them, delete everything, or withdraw consent as easily as they gave it; inactive accounts expire.

**Blocked by:** 06: Consent, Screening and outcomes, 16: Nutrition targets and water

**Status:** ready-for-agent

**Roadmap week:** 7

- [ ] One-tap export: JSON of all user data plus CSV of Logs; API test proves every user-owned table is included
- [ ] Delete account: hard delete of all rows within 30 days; backups age out on the same schedule
- [ ] Withdraw health-data consent: processing stops, export then deletion offered; consent record updated (append-only)
- [ ] Accounts inactive for 24 months deleted after a 30-day email warning
- [ ] Settings → Safety shows the full disclaimer, REDs card and emergency numbers
- [ ] API tests cover export completeness, deletion and withdrawal; Playwright covers the export and delete flows
