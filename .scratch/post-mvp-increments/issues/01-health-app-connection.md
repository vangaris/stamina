# Health-app connection: Health Connect and Apple Health

Status: backlog
Proposed increment: 1

Source: ruled out of the 8-week MVP in MVP scope per Pillar, including Nutrition depth (`.scratch/mvp-plan/issues/12-mvp-scope.md`).

## What

Ship the **React Native (Expo, development builds, EAS)** iOS and Android apps, built on the shared `packages/app-core`, `domain`, `contracts`, `tokens` and `i18n`. Only views and hooks are new. Import Activities and workouts from Google Health Connect (`react-native-health-connect`) and Apple Health (`react-native-health`) so Adaptation reacts without manual logging; optionally write Sessions back. Native daily-reminder notifications replace web push / email for app users. Ship first as a beta: Google Play closed testing (12 testers × 14 days, required for new personal accounts) and TestFlight.

## Why not in the MVP

Needs the React Native app (decided in Delivery platform and frontend architecture) and paid developer accounts: Google Play US$25 one-off, Apple Developer Program US$99/yr (first paid threshold; TestFlight also requires it). EAS free-plan limits to be verified when this increment is planned. Rebuilding the core screens in React Native is the largest cost of this increment.

## Depends on

Delivery platform and frontend architecture (`.scratch/mvp-plan/issues/19-frontend-architecture.md`); Data model, database, privacy and backups (imported health data scope, consent).
