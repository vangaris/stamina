# 24: R2 backups, restore test and OpenTofu state

**What to build:** Cloudflare R2 (EU jurisdiction) is enabled and everything that needs it runs for real: OpenTofu is applied with its state in R2, the production database is backed up nightly with an age-encrypted dump, and the monthly restore test has passed once. The code, workflows and a local smoke test for all of this already exist from ticket 02 (`infra/`, `scripts/ops/backup-*.sh`, `.github/workflows/backup.yml`, `restore-test.yml`, `docs/infra.md`, `docs/backups.md`); what is missing is a Cloudflare R2 account setup and real runs.

**Blocked by:** 02: Release, infrastructure and ops pipeline

**Status:** ready-for-agent

**Phase:** B (launch: other users, production data, payment methods)

**Roadmap week:** 1

- [ ] R2 is enabled on the Cloudflare account; if it holds a card, a €5 budget alert exists; the decision is recorded in `docs/infra.md`
- [ ] `infra/bootstrap.sh` creates the EU-jurisdiction state bucket; `infra/tofu.sh` applies `infra/envs/production` with state in R2; existing Pages, Neon and Sentry resources are imported and a second `tofu plan` shows no changes
- [ ] `R2_BACKUP_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are set (token scoped to the one bucket); `infra-plan.yml` runs a real plan on a PR that touches `infra/`
- [ ] A real nightly backup run writes an age-encrypted dump to the EU bucket; the 30-day prune is exercised; the age private key copy in Vang's password manager is confirmed
- [ ] A real monthly restore test restores the latest dump into a scratch Neon branch, reports `RESULT=pass`, and deletes the branch
- [ ] Failures are visible: a deliberately failed run (wrong key or empty bucket) turns the workflow red and emails Vang

## Notes

- Parked from ticket 02 by Vang on 2026-10-30 (R2 may ask for a card).
- Unverified until this ticket: real R2 S3 behaviour, Neon role privileges for `CREATE DATABASE` in the restore test, `pg_dump` 17 against Neon, the PGDG install on `ubuntu-latest`, and the Sentry/Cloudflare provider permission names.
- Tickets 21 (daily digest shows backup and restore results) and 23 (restore test passed within 30 days) depend on this.
