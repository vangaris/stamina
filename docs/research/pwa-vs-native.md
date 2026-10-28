# PWA vs Capacitor vs native: iOS limits, HealthKit path

Ticket: `.scratch/mvp-plan/issues/08-pwa-vs-native.md`. All sources accessed 2026-10-28. Facts only; no product decision is made here.

## Answer

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

## 1. PWA platform limits (2026)

| Capability (ticket need) | iOS / iPadOS (Safari, WebKit) | Android (Chrome / Chromium) | Source |
|---|---|---|---|
| Web push | Home Screen web apps only (since iOS 16.4). Permission must be requested from a user gesture. Every push must show a visible notification (`userVisibleOnly`); breaking that revokes the subscription. No Apple Developer Program membership needed. Declarative Web Push (no service worker needed) since iOS 18.4. | `PushManager` since Chrome 42; no install needed. | [S1][S3][S4][S5][S9] |
| Scheduled local notifications (reminders) | No web API. | No shipped API. Notification Triggers: origin trial complete, "Launch: Not started", and no `showTrigger` in MDN compat data. | [S10][S9] |
| Badging | `setAppBadge` in Home Screen apps since iOS 16.4. | Not supported on Chrome Android. | [S1][S9] |
| Storage quota | Safari 17+ / iOS 17+: per-origin quota ≤60% of disk for browser apps and ≤15% for other WebKit apps. Overall quota 80% / 20%. Home Screen web apps get the same quota as the browser. | An origin may use up to 60% of total disk; Chrome uses at most 80% of disk overall. | [S7][S12] |
| Eviction | Best-effort by default. Whole origin evicted LRU when over quota, under storage pressure, or after no interaction. ITP deletes script-writeable storage after 7 days without interaction, but Home Screen web app domains are exempt. `persist()` (Safari 15.2+) is granted by heuristics such as being opened as a Home Screen app. | LRU eviction of non-persistent origins under storage pressure. `persist()` since Chrome 55, auto-approved or denied from interaction history. | [S7][S8][S12][S9] |
| Background Sync / Periodic Sync | Not supported (Safari, iOS Safari). | Background Sync since Chrome 49. Periodic Sync since Chrome 80 (experimental), only for installed apps, with frequency gated by engagement score. | [S9][S34] |
| Screen Wake Lock (Session timers) | Safari 16.4; working in Home Screen web apps since iOS 18.4 ("Fixed Screen Wake Lock API for Home Screen Web Apps"). | Chrome 84. | [S5][S9] |
| Vibration (timer haptics) | `navigator.vibrate` not supported. | Chrome Android 32+ (needs user gesture). | [S9] |
| Background execution of timers | **Unverified:** no primary source found that documents JS timer behaviour while an iOS Home Screen app is backgrounded. WebKit says Web Push "is not an invitation for silent background runtime". | **Unverified** for the same reason. | [S3] |
| Install prompt | No `beforeinstallprompt`; the user installs manually via Share → Add to Home Screen. iOS 26: every site added to the Home Screen opens as a web app by default; "zero requirements for 'installability'". | `beforeinstallprompt` since Chrome 61; not in Firefox or Safari. | [S6][S9][S11] |
| EU DMA | iOS 17.4 beta removed Home Screen web apps in the EU; Apple reversed this, and they "continue to be built directly on WebKit". Browsers with alternative engines (EU) use their own storage policies. | n/a | [S13][S12] |
| Store presence | A PWA cannot go on the App Store as such; a wrapper is judged under 4.2 "beyond a repackaged website". | A PWA can be packaged for Play as a Trusted Web Activity (Bubblewrap), verified by Digital Asset Links. Play policies, including billing, then apply. | [S2][S35] |

## 2. What Capacitor adds

| Area | Facts | Source |
|---|---|---|
| Runtime / licence | Capacitor v8. `@capacitor/core` 8.5.3, MIT. The same plugins run in web and native contexts with the same API, so one Vue build can serve both the PWA and the store apps. | [S15][S31] |
| Local notifications | `@capacitor/local-notifications`. Android 13 needs the `POST_NOTIFICATIONS` prompt. Android 12+ needs `SCHEDULE_EXACT_ALARM` for exact timing, and the user can disable it. Android 14 has `USE_EXACT_ALARM` only where exact alarms are core. `allowWhileIdle` fires at most once per 9 minutes per app in Doze. iOS keeps only the soonest-firing 64 scheduled notifications. | [S16][S21] |
| Push | `@capacitor/push-notifications` uses FCM on Android and APNs on iOS. iOS silent push is not supported by the plugin; data-only FCM messages don't reach JS if the app was killed. | [S17] |
| Background work | `@capacitor/background-runner` needs the iOS Background fetch and Background processing modes plus `BGTaskSchedulerPermittedIdentifiers`; interval is set in minutes. Guideline 2.5.4: background services only for their intended purposes. | [S18][S2] |
| HealthKit / Health Connect | `@capacitor/health-fitness` (official, MIT, v1.0.2): "Not available on web". Needs the iOS HealthKit entitlement and Info.plist usage strings. Health Connect permissions are written into the manifest at sync. Workout queries are iOS only. `READ_HEALTH_DATA_HISTORY` is needed to read data from before the first 30 days. Alternatives: `@capgo/capacitor-health` 8.11.13 (MPL-2.0; Android 8+ / iOS 14+; read/write and workouts), `capacitor-health` 8.4.0 (mley, MIT), Capawesome Health (paid "Insiders" subscription). | [S19][S31][S36][S37] |
| Store distribution | Gives App Store and Play binaries, so Apple/Google review, payment and health policies (§3) apply. | [S2][S25] |
| Build toolchain | iOS builds need macOS; Capacitor 8 needs Xcode 26.0 or newer. Cloud builds (e.g. Appflow) are mentioned as an alternative. | [S30] |

### Health platform facts (all native options)

| Fact | Source |
|---|---|
| HealthKit runs on iPhone, Apple Watch, visionOS, and iPadOS 17+. Enabling it adds a required device capability, and apps must call `isHealthDataAvailable()` first. | [S20][S22] |
| Health Connect is part of the Android framework from Android 14 (API 34). On Android 13 and lower the user must install the Health Connect app from Play. | [S24] |
| Google Fit APIs "will be deprecated in 2026"; no new sign-ups since 1 May 2024. Google points to Health Connect (on device) or the Google Health API (cloud). | [S38] |
| Google Health API is the cloud REST/OAuth successor to the Fitbit Web API, covering Fitbit, Pixel Watch and other sources. Legacy Fitbit Web API endpoints turn off on 2 Nov 2026. It is a server-side path that does not need a native app (for Fitbit/Pixel data only). | [S39] |

## 3. Store policy requirements

### Apple App Store Review Guidelines (last updated 16 Oct 2026) [S2]

| Guideline | Requirement relevant to Stamina |
|---|---|
| 1.4.1 | Medical apps that could give inaccurate data, or be used to diagnose or treat, "may be reviewed with greater scrutiny". |
| 2.5.1 | HealthKit "should be used for health and fitness purposes and integrate with the Health app"; the integration must be stated in the app description. |
| 2.5.2 | Apps may not download code that "introduces or changes features or functionality". |
| 3.1.1 | Unlocking features or functionality (subscriptions, premium content) must use in-app purchase. |
| 3.1.1(a) | Link-out entitlements for specific storefronts. Outside the **US** storefront, calls to action to non-IAP purchasing are banned; in the US no entitlement is needed for buttons, external links or other calls to action. |
| 3.1.2(a) | Auto-renewable subscriptions must give ongoing value, last ≥7 days and be available on all of the user's devices. |
| 3.1.3(d) | Real-time **person-to-person** services (example given: "fitness training") may use other payment methods; one-to-few and one-to-many must use IAP. |
| 4.2 | Must be "beyond a repackaged website"; 4.2.2: not primarily web clippings. |
| 5.1.1 | (i) Privacy policy in App Store Connect and in the app, covering retention and deletion. (ii) Consent; withdrawal must be easy; GDPR legitimate-interest use must comply with GDPR. (iii) Data minimisation. (v) Account deletion inside the app. (ix) Apps in highly regulated fields, "healthcare" among them, should be submitted by a legal entity, not an individual. |
| 5.1.2(i) | Disclose sharing with third parties "including with third-party AI" and get explicit permission first. |
| 5.1.3 | (i) Health/fitness data, incl. HealthKit and Motion & Fitness, may not be used or disclosed for ads, marketing or data mining; apps must disclose the specific health data collected. (ii) No false data written into HealthKit; no personal health information stored in iCloud. |

### Apple EU (DMA) terms, effective 1 Oct 2026 [S14]

| Item | Fact |
|---|---|
| IAP commission (EU) | 26% standard. 15% for the Small Business Program and for subscriptions after year 1. |
| Alternative in-app PSP | 20% (10% for the Small Business Program or subscriptions after year 1). |
| Out-of-app offer with link | Store services commission of 15% / 10%, on sales within 7 days of the tap. |
| Payment-option lock-in | The chosen payment options must stay in place for 12 months. Parental gates apply for users under 18. |
| Outside the App Store | Core Technology Commission 5% on digital sales. Core Technology Fee, Initial Acquisition Fee and Store Services Fee eliminated. |
| Web Distribution eligibility | At least one of: D&B financial-stability score, publicly traded, VC-funded, financial audit, nonprofit/government fee waiver, US$1M standby letter of credit, or 1M first-year installs. No EU entity needed anymore. |
| US link-out commission | **Unverified:** secondary reports say Apple proposed a commission of up to 15% in Aug 2026, pending court approval. No Apple primary page was found. |

### Google Play

| Policy | Requirement | Source |
|---|---|---|
| Health Content and Services | All developers complete the **Health apps declaration** in Play Console. The privacy policy must be linked in Play Console and in the app. Request no permissions beyond core functionality. Non-medical-device health apps must state "not a medical device and does not diagnose, treat, cure, or prevent any medical condition" and remind users to consult a healthcare professional. | [S25] |
| Health Connect permissions | Declare and justify each permission in Play Console. Approved use case "Fitness, wellness and coaching" includes "providing personalized workout or meal plans" and sleep analysis. Health data may not be used for ads or sold. Encryption at rest and in transit is required. No headless apps. Not for apps that solely target children. | [S26] |
| Payments | Digital features and subscriptions ("fitness" named) must use Play Billing unless an eligible alternative-billing or external-link programme applies. | [S40] |
| EEA alternative billing | Registered businesses only. From 30 Jun 2026 the fee is 10% for subscriptions. | [S41] |
| US (Epic injunction) | Since 29 Oct 2025 Google does not require Play Billing for US users and allows external links. The alternative-billing and external-links programmes started 9 Dec 2025, and fee reporting and payment started 1 Oct 2026. A new Epic settlement (4 Mar 2026) awaits a modified injunction. | [S42] |
| Service fees (EEA/UK/US from 30 Jun 2026) | Auto-renewing subscriptions: 10% + 5% billing fee. Other regions: 15% for subscriptions and for the first US$1M. | [S33] |

## 4. Developer account costs

| Account | Cost | Conditions | Source |
|---|---|---|---|
| Apple Developer Program | US$99 per membership year (local pricing may vary). Fee waiver only for nonprofits, education and government. | Individual: legal name shown as seller. Organisation: legal entity plus D-U-N-S number. | [S27] |
| App Store Small Business Program | 15% commission | Up to US$1M proceeds in the prior calendar year. | [S28] |
| Google Play Console | US$25 one-time | ID verification. Personal accounts created after 13 Nov 2023 need a closed test with ≥12 testers for 14 continuous days, plus device verification, before production. | [S29][S32] |
| iOS web push | US$0 | No Apple Developer Program membership needed. | [S1] |

## 5. Decision table

Ticket needs: (a) offline logging, (b) reminders, (c) Session timers, (d) later Apple Health / Health Connect. "Vue reuse" means reusing the preferred Vue 3 + TS stack.

| Option | Vue reuse | (a) Offline logging | (b) Reminders | (c) Session timers | (d) HealthKit / HC | Distribution & payments | Upfront cost | Main trade-offs |
|---|---|---|---|---|---|---|---|---|
| **PWA-only** | Full | IndexedDB; persistence is heuristic on iOS; Home Screen apps exempt from the 7-day ITP wipe; iOS has no Background Sync [S7][S8][S9] | Server web push only; iOS needs Add to Home Screen first, with no prompt to guide users [S1][S10][S11] | Wake lock (iOS 18.4+); no vibration on iOS; background behaviour unverified [S5][S9] | **Not possible** (no web API). Server-side Google Health API covers only Fitbit/Pixel data [S19][S39] | Web only; own payment processor; no store commission or review | €0 | Lowest cost. iOS reminders depend on users installing to the Home Screen. No App Store discovery. Adding Health later means adding a native shell. |
| **PWA + Capacitor** | Full; one build serves the PWA and the store apps [S15] | Web storage in the WebView plus native plugins | Native local notifications (iOS 64-pending cap; Android exact-alarm permission) plus FCM/APNs [S16][S17][S21] | Native notifications for timer end; background runner [S18] | Official `@capacitor/health-fitness` (MIT) and community plugins [S19][S31] | App Store + Play. IAP / Play Billing rules apply outside the US and EU exemptions [S2][S14][S40]. 4.2 "repackaged website" risk [S2] | US$99/yr + US$25 | Can launch as a PWA and add store builds later without a rewrite. Needs macOS/Xcode 26 [S30]. Play 12-tester gate [S32]. Depends on third-party plugins. |
| **Native (Swift + Kotlin)** | None (two new codebases) | Platform DBs | Full platform APIs (iOS 64-pending cap still applies) [S21] | Full platform APIs | First-party HealthKit and Health Connect SDKs [S20][S24] | Same store rules as Capacitor | US$99/yr + US$25 | Best platform fit. Two codebases for a solo founder; no web/PWA channel without a third build. |
| **React Native** | None (React/TS, not Vue); MIT [S43] | Native modules | Native modules | Native modules | `react-native-health` (HealthKit, MIT) and `react-native-health-connect` (MIT) [S44][S45] | Same store rules | US$99/yr + US$25 | One TS codebase for both stores, but it means leaving Vue. A web version would need separate work. |
| **Flutter** | None (Dart); BSD-3 [S46] | Native plugins | Native plugins | Native plugins | `health` 13.3.2 (HealthKit + Health Connect) [S47] | Same store rules | US$99/yr + US$25 | One Dart codebase; Vue/TS skills not reused. |

## Sources (all accessed 2026-10-28)

- [S1] WebKit, "Web Push for Web Apps on iOS and iPadOS" — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- [S2] Apple, App Store Review Guidelines (Last Updated 16 Oct 2026) — https://developer.apple.com/app-store/review/guidelines/
- [S3] WebKit, "Meet Web Push" — https://webkit.org/blog/12945/meet-web-push/
- [S4] WebKit, "Meet Declarative Web Push" — https://webkit.org/blog/16535/meet-declarative-web-push/
- [S5] WebKit, "WebKit Features in Safari 18.4" — https://webkit.org/blog/16574/webkit-features-in-safari-18-4/
- [S6] WebKit, "WebKit Features in Safari 26.0" — https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- [S7] WebKit, "Updates to Storage Policy" — https://webkit.org/blog/14403/updates-to-storage-policy/
- [S8] WebKit, Tracking Prevention ("Home Screen Web Application Domain Exempt From ITP") — https://webkit.org/tracking-prevention/
- [S9] MDN browser-compat-data (SyncManager, PeriodicSyncManager, WakeLock, PushManager, Window.beforeinstallprompt, StorageManager.persist, Navigator.setAppBadge, Navigator.vibrate, Notification) — https://github.com/mdn/browser-compat-data/tree/main/api
- [S10] Chrome for Developers, Notification Triggers API — https://developer.chrome.com/docs/web-platform/notification-triggers
- [S11] web.dev, Learn PWA: Installation prompt — https://web.dev/learn/pwa/installation-prompt
- [S12] MDN, Storage quotas and eviction criteria — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- [S13] Apple, "Update on apps distributed in the EU" (archived 10 Mar 2024; section "Why don't users in the EU have access to Home Screen web apps?") — https://web.archive.org/web/20240310160524/https://developer.apple.com/support/dma-and-apps-in-the-eu/
- [S14] Apple, Apps in the EU (current; DPLA updated 18 Aug 2026, effective 1 Oct 2026) — https://developer.apple.com/support/dma-and-apps-in-the-eu/
- [S15] Capacitor, Building Progressive Web Apps — https://capacitorjs.com/docs/web/progressive-web-apps
- [S16] Capacitor, Local Notifications — https://capacitorjs.com/docs/apis/local-notifications
- [S17] Capacitor, Push Notifications — https://capacitorjs.com/docs/apis/push-notifications
- [S18] Capacitor, Background Runner — https://capacitorjs.com/docs/apis/background-runner
- [S19] Capacitor, @capacitor/health-fitness — https://capacitorjs.com/docs/apis/health-fitness
- [S20] Apple, About the HealthKit framework — https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework
- [S21] Apple, UILocalNotification ("the system keeps the soonest-firing 64 notifications") — https://developer.apple.com/documentation/uikit/uilocalnotification
- [S22] Apple, Setting up HealthKit — https://developer.apple.com/documentation/healthkit/setting-up-healthkit
- [S23] (same as S19: "Not available on web")
- [S24] Android Developers, Get started with Health Connect — https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started
- [S25] Play Console Help, Health Content and Services — https://support.google.com/googleplay/android-developer/answer/16679511
- [S26] Play Console Help, Android Health Permissions: Guidance and FAQs — https://support.google.com/googleplay/android-developer/answer/12991134
- [S27] Apple, Enrollment — https://developer.apple.com/programs/enroll/ ; What's included — https://developer.apple.com/programs/whats-included/
- [S28] Apple, App Store Small Business Program — https://developer.apple.com/app-store/small-business-program/
- [S29] Play Console Help, Get started with Play Console (registration fee) — https://support.google.com/googleplay/android-developer/answer/6112435
- [S30] Capacitor, Environment Setup — https://capacitorjs.com/docs/getting-started/environment-setup
- [S31] npm registry: `@capacitor/core` (8.5.3, MIT) https://registry.npmjs.org/@capacitor/core/latest ; `@capacitor/health-fitness` (1.0.2, MIT) https://registry.npmjs.org/@capacitor/health-fitness/latest ; `@capgo/capacitor-health` (8.11.13, MPL-2.0) https://registry.npmjs.org/@capgo/capacitor-health/latest ; `capacitor-health` (8.4.0, MIT) https://registry.npmjs.org/capacitor-health/latest
- [S32] Play Console Help, App testing requirements for new personal developer accounts — https://support.google.com/googleplay/android-developer/answer/14151465
- [S33] Play Console Help, Service fees — https://support.google.com/googleplay/android-developer/answer/112622
- [S34] MDN, Web Periodic Background Synchronization API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API
- [S35] Chrome for Developers, Trusted Web Activity overview — https://developer.chrome.com/docs/android/trusted-web-activity
- [S36] Cap-go/capacitor-health README — https://github.com/Cap-go/capacitor-health
- [S37] Capawesome, "Announcing the Capacitor Health Plugin" — https://capawesome.io/blog/announcing-the-capacitor-health-plugin
- [S38] Google, Google Fit — https://developers.google.com/fit
- [S39] Google, Google Health API — https://developers.google.com/health
- [S40] Play Console Help, Payments policy — https://support.google.com/googleplay/android-developer/answer/9858738
- [S41] Play Console Help, Alternative billing for users in the EEA — https://support.google.com/googleplay/android-developer/answer/12348241
- [S42] Play Console Help, Update regarding Google Play's policies for developers serving users in the US — https://support.google.com/googleplay/android-developer/answer/15582165
- [S43] facebook/react-native (MIT) — https://github.com/facebook/react-native
- [S44] agencyenterprise/react-native-health (MIT) — https://github.com/agencyenterprise/react-native-health
- [S45] matinzd/react-native-health-connect (MIT) — https://github.com/matinzd/react-native-health-connect
- [S46] flutter/flutter (BSD-3-Clause) — https://github.com/flutter/flutter
- [S47] pub.dev, `health` 13.3.2 — https://pub.dev/packages/health
