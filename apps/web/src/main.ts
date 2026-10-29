import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router.ts';
import './style.css';

const app = createApp(App).use(createPinia()).use(router);

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
  app.mount('#app');
}

void start();
