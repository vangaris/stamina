# PWA vs Capacitor vs native: iOS limits, HealthKit path

Type: research
Status: resolved

## Question

For a Vue 3 + TypeScript mobile-first coaching app needing offline logging, local notifications/reminders, timers during Sessions, and a later Apple Health / Google Health Connect integration: what are the current (2026) iOS and Android PWA limits (web push on iOS home-screen apps, storage quotas and eviction, background sync, wake lock, install prompts, EU DMA effects on iOS PWAs), what does Capacitor add (HealthKit / Health Connect plugins, store distribution, push), what do App Store Review Guidelines (incl. 5.1.1, 5.1.3 health data, 3.1 in-app purchase rules and the post-2025 US/EU external payment changes) and Google Play health policies require, and what are the developer account costs? Output a decision table: PWA-only, PWA + Capacitor, native (Swift/Kotlin, React Native, Flutter).

## Answer

iOS PWA: push + wake lock only once installed; no background sync, no scheduled local notifications, no HealthKit. Capacitor keeps the Vue build and adds native notifications + health plugins. Apple $99/yr, Play $25 once (12 testers × 14 days).

Full findings: `docs/research/pwa-vs-native.md` on branch `research/pwa-vs-native` (commit `fa7abb7`).

- **The web has no API for HealthKit.** Apple documents HealthKit only as an on-device framework that native apps opt into with an entitlement, and Capacitor's own health plugin says it is "Not available on web" [S20][S23]. Health Connect is also an on-device Android API [S24]. So Apple Health / Health Connect means shipping a native binary: Capacitor, RN, Flutter or Swift/Kotlin.
- **iOS PWA limits (iOS/Safari 26):**
  - Web push works only for Home Screen web apps, and every push must show a notification (no silent push) [S1][S3][S4].
  - There is no install prompt. Since iOS 26, any site added to the Home Screen opens as a web app [S6][S9][S11].
  - Screen Wake Lock works in Home Screen apps from iOS 18.4 [S5][S9].
  - Background Sync, Periodic Background Sync and Vibration are not supported [S9].
  - No browser ships scheduled local notifications (Notification Triggers never launched) [S10]. Reminders in a PWA therefore need server-sent push.
- **Storage:**
  - WebKit origin quota is ≤60% of disk in browsers and ≤15% in other apps. Storage is best-effort and evicted LRU unless persisted [S7].
  - Home Screen apps are exempt from ITP's 7-day wipe of script-written storage, and WebKit uses "opened as a Home Screen Web App" as a signal to grant `persist()` [S7][S8].
  - Chromium gives an origin up to 60% of disk [S12].
- **EU DMA:** Apple removed Home Screen web apps in the EU in the iOS 17.4 beta, then restored them. They stay WebKit-only [S13][S12]. Web Distribution of native apps in the EU needs, for example, D&B financial standing, VC funding or a US$1M letter of credit [S14].
- **What Capacitor (v8, MIT) adds** [S15]–[S19][S30]:
  - The same Vue/TS build can still ship as the PWA.
  - Native local notifications. iOS keeps only the 64 soonest-firing ones [S21]. Android 12+ needs exact-alarm permission [S16].
  - FCM/APNs push, but no iOS silent push in the official plugin [S17].
  - BGTask background runner [S18].
  - HealthKit and Health Connect plugins: official `@capacitor/health-fitness` (MIT), `@capgo/capacitor-health` (MPL-2.0), `capacitor-health` (MIT) [S19][S31].
  - iOS builds need macOS and Xcode 26 [S30].
- **Store rules:**
  - Apple:
    - 3.1.1 requires in-app purchase (IAP) for digital unlocks such as subscriptions, except where storefront rules allow otherwise: the US storefront allows external links and buttons, and the EU now allows alternative PSPs and link-outs at 20%/15% commission (10% for small businesses) [S2][S14].
    - 4.2 rejects "repackaged websites".
    - 5.1.1 requires a privacy policy, consent and in-app account deletion.
    - 5.1.2 requires explicit permission before sharing data with third-party AI.
    - 5.1.3 bans using health data for ads and bans storing personal health information in iCloud [S2].
  - Google Play: a Health apps declaration form, a privacy policy and a "not a medical device…" disclaimer [S25]. Health Connect access needs a justification per permission; "fitness, wellness and coaching" incl. "personalized workout or meal plans" is an approved use case [S26].
- **Account costs:**
  - Apple: US$99 per year [S27]. Small Business Program: 15% commission [S28].
  - Google Play: US$25 one-off [S29]. New personal accounts must run a closed test with ≥12 testers for 14 days before production [S32]. Subscription fee in the EEA/UK/US: 10% + 5% billing fee [S33].
