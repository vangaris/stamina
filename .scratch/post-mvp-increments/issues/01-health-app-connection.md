# Health-app connection: Health Connect and Apple Health

Status: backlog
Proposed increment: 1

Source: ruled out of the 8-week MVP in MVP scope per Pillar, including Nutrition depth (`.scratch/mvp-plan/issues/12-mvp-scope.md`).

## What

Import Activities and workouts from Google Health Connect (Android) and Apple Health (iOS) so Adaptation reacts without manual logging; optionally write Sessions back. Ship first as a beta: Google Play closed testing (12 testers × 14 days, required for new personal accounts) and TestFlight.

## Why not in the MVP

Needs a native-capable delivery platform (decided in Frontend platform and architecture) and paid developer accounts: Google Play US$25 one-off, Apple Developer Program US$99/yr (first paid threshold; TestFlight also requires it).

## Depends on

Frontend platform and architecture; Data model, database, privacy and backups (imported health data scope, consent).
