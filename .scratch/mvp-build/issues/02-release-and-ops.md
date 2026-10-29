# 02: Release, infrastructure and ops pipeline

**What to build:** Production exists and is operated safely: infrastructure is declared in code, releases deploy themselves from a release PR, the database is backed up nightly and restore-tested monthly, errors and downtime alert Vang, and logs can never carry health data.

**Blocked by:** 01: Walking skeleton

**Status:** in-progress

**Roadmap week:** 1

- [ ] OpenTofu manages Cloudflare (Pages, R2, DNS), Neon (project, branches) and Sentry, with state in R2; Deno Deploy, UptimeRobot and Brevo set up by documented scripts
- [ ] release-please maintains a release PR; merging it tags, runs production migrations, deploys API then web, and smoke-checks the health endpoint
- [ ] A scheduled job writes an encrypted pg_dump nightly to an EU-jurisdiction R2 bucket, keeping 30 days; a monthly job restores the latest dump into a scratch database and reports the result
- [ ] Sentry (EU region) captures web and API errors with personal-data scrubbing on
- [ ] UptimeRobot checks the health endpoint every 5 minutes and alerts Vang
- [x] API logging emits only allowlisted fields (request ID, route, status, latency, pseudonymous user ID, error type); an API test proves request bodies never reach logs
- [ ] Dependabot configured for npm and GitHub Actions with weekly grouped updates; €5 budget alerts on every account that holds a card
