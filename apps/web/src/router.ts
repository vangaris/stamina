import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

/** Labels are message keys (`nav.<id>`); the shell translates them. */
export const tabs = [
  { id: 'today', path: '/today' },
  { id: 'session', path: '/session' },
  { id: 'meals', path: '/meals' },
  { id: 'progress', path: '/progress' },
] as const;

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/today' },
  { path: '/today', name: 'today', component: () => import('./pages/TodayPage.vue') },
  { path: '/session', name: 'session', component: () => import('./pages/SessionPage.vue') },
  { path: '/meals', name: 'meals', component: () => import('./pages/MealsPage.vue') },
  { path: '/progress', name: 'progress', component: () => import('./pages/ProgressPage.vue') },
];

// Developer-only UI kit page. `import.meta.env.DEV` is a build-time constant, so a production
// build drops this branch and the page's chunk with it.
if (import.meta.env.DEV) {
  routes.push({
    path: '/dev/ui',
    name: 'dev-ui',
    component: () => import('./dev/UiKitPage.vue'),
  });
}

export const router = createRouter({ history: createWebHistory(), routes });
