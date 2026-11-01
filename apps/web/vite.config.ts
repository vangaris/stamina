import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { AUTH_PATH } from './src/config.ts';
import { createAuthDevProxy } from './vite/create-auth-dev-proxy.ts';

export default defineConfig(({ mode }) => {
  // Where Neon Auth lives (its base URL ends in `/auth`). Unset: no proxy, sign-in cannot work.
  const authTarget = loadEnv(mode, process.cwd(), 'AUTH_PROXY_').AUTH_PROXY_TARGET;
  const proxy = authTarget ? { proxy: { [AUTH_PATH]: createAuthDevProxy(authTarget) } } : {};

  return {
    // Make the DSN a build-time constant so a build without one drops the Sentry chunk entirely.
    define: {
      'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(
        loadEnv(mode, process.cwd(), 'VITE_').VITE_SENTRY_DSN ?? '',
      ),
    },
    // The browser talks to Neon Auth only through this same-origin path (see functions/auth for the
    // production twin), so the session cookie is first-party.
    server: proxy,
    preview: proxy,
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
        manifest: {
          name: 'Stamina',
          short_name: 'Stamina',
          description: 'Training, food and recovery planned around the sport you play.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#ffffff',
          theme_color: '#4338ca',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // SPA: deep links like /meals open the cached shell offline.
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          // A page load of the auth proxy must reach the network, not the cached shell.
          navigateFallbackDenylist: [new RegExp(`^${AUTH_PATH}/`)],
        },
      }),
    ],
  };
});
