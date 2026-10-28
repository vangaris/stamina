# Delivery platform and frontend architecture

Type: grilling
Status: open
Blocked by: 08, 12, 15, 18, 22, 23

## Question

Decided last among the product decisions, on best practices, once the engine, onboarding and core screens are known (Vang, MVP scope session). Which delivery platform and framework (PWA, PWA + Capacitor, React Native / Expo, Flutter, native Swift/Kotlin), weighed on: MVP launch in 8 weeks at ~18 h/week with AI agents, Vang's Vue 3 + TS strength, the post-MVP health-app connection increment (Health Connect, Apple Health; beta via Play closed testing and TestFlight), offline needs, the daily Check-in reminder channel, store policy and cost? Then the architecture: monorepo layout (Nx or not), routing, state management, offline-first strategy for Logs, Check-ins and Activities (local store, sync, conflict rules), i18n (EN + EL, ICU messages, units metric/imperial, time zones), component library / design-system base, and testing approach.
