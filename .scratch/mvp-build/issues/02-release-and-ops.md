# 02: Release, infrastructure and ops pipeline

**What to build:** Production exists and is operated safely: infrastructure is declared in code, releases deploy themselves from a release PR, the database is backed up nightly and restore-tested monthly, errors and downtime alert Vang, and logs can never carry health data.

**Blocked by:** 01: Walking skeleton

**Status:** done

**Roadmap week:** 1

- [x] Deno Deploy, UptimeRobot and Brevo set up by documented scripts (`scripts/ops/*-setup.sh`); OpenTofu config for Cloudflare, Neon and Sentry written, validated and tested (applying it with state in R2 moved to ticket 24)
- [x] release-please maintains a release PR; merging it tags, runs production migrations, deploys API then web, and smoke-checks the health endpoint
- Moved to ticket 24 (user decision, R2 parked): nightly encrypted backup and monthly restore test running against real R2; the code and local smoke test are done
- [x] Sentry (EU region) captures web and API errors with personal-data scrubbing on
- [x] UptimeRobot checks the health endpoint every 5 minutes and alerts Vang
- [x] API logging emits only allowlisted fields (request ID, route, status, latency, pseudonymous user ID, error type); an API test proves request bodies never reach logs
- [x] Dependabot configured for npm and GitHub Actions with weekly grouped updates; €5 budget alerts on every account that holds a card

## Moved to ticket 24

Vang parked Cloudflare R2 on 2026-10-30. Everything that needs R2 moved to `24-r2-backups-and-tofu-state.md`: applying OpenTofu with state in R2, the first real nightly backup, and the first real restore test. The scheduled backup and restore workflows skip silently until `R2_BACKUP_BUCKET` is set.
