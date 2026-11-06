import { getSession } from '@stamina/app-core';
import { createPinia } from 'pinia';
import { createApp, watchEffect } from 'vue';
import App from './App.vue';
import { i18n } from './i18n.ts';
import { useMediator, useServices, useStores } from './mediator.ts';
import { router } from './router.ts';
import { startAppSync } from './utils/start-app-sync.ts';
import './style.css';

const app = createApp(App).use(createPinia()).use(router).use(i18n);

// Screen readers pick pronunciation from <html lang>.
watchEffect(() => {
  document.documentElement.lang = i18n.global.locale.value;
});

async function start() {
  // Sentry must be ready before the first component runs so mount errors are captured. A build
  // without a DSN carries none of the SDK (the constant is replaced at build time).
  if (import.meta.env.VITE_SENTRY_DSN) {
    const { initSentry } = await import('./sentry.ts');
    initSentry(app, {
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    });
  }
  // Learn once whether a session cookie exists. Failing (offline, no auth server) leaves the
  // status unknown, which is not an error worth surfacing.
  void useMediator()
    .send(getSession())
    .catch(() => undefined);
  // Sets and finishes logged without signal wait in the offline queue; send them now, and again
  // whenever the app regains focus or the phone comes back online.
  startAppSync({ services: useServices(), stores: useStores(), target: window });
  app.mount('#app');
}

void start();
