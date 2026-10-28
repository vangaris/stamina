# PWA vs Capacitor vs native: iOS limits, HealthKit path

Type: research
Status: open

## Question

For a Vue 3 + TypeScript mobile-first coaching app needing offline logging, local notifications/reminders, timers during Sessions, and a later Apple Health / Google Health Connect integration: what are the current (2026) iOS and Android PWA limits (web push on iOS home-screen apps, storage quotas and eviction, background sync, wake lock, install prompts, EU DMA effects on iOS PWAs), what does Capacitor add (HealthKit / Health Connect plugins, store distribution, push), what do App Store Review Guidelines (incl. 5.1.1, 5.1.3 health data, 3.1 in-app purchase rules and the post-2025 US/EU external payment changes) and Google Play health policies require, and what are the developer account costs? Output a decision table: PWA-only, PWA + Capacitor, native (Swift/Kotlin, React Native, Flutter).
