import { createRouter, createWebHistory } from 'vue-router';

export const tabs = [
  { id: 'today', label: 'Today', path: '/today' },
  { id: 'session', label: 'Session', path: '/session' },
  { id: 'meals', label: 'Meals', path: '/meals' },
  { id: 'progress', label: 'Progress', path: '/progress' },
] as const;

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/today' },
    { path: '/today', name: 'today', component: () => import('./pages/TodayPage.vue') },
    { path: '/session', name: 'session', component: () => import('./pages/SessionPage.vue') },
    { path: '/meals', name: 'meals', component: () => import('./pages/MealsPage.vue') },
    { path: '/progress', name: 'progress', component: () => import('./pages/ProgressPage.vue') },
  ],
});
