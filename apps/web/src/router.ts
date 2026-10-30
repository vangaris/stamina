import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { RouteName } from './enums/route-name.ts';
import { RoutePath } from './enums/route-path.ts';
import { TabId } from './enums/tab-id.ts';

/** Labels are message keys (`nav.<id>`); the shell translates them. */
export const tabs = [
  { id: TabId.Today, path: RoutePath.Today },
  { id: TabId.Session, path: RoutePath.Session },
  { id: TabId.Meals, path: RoutePath.Meals },
  { id: TabId.Progress, path: RoutePath.Progress },
] as const;

const routes: RouteRecordRaw[] = [
  { path: RoutePath.Root, redirect: RoutePath.Today },
  {
    path: RoutePath.Today,
    name: RouteName.Today,
    component: () => import('./pages/TodayPage.vue'),
  },
  {
    path: RoutePath.Session,
    name: RouteName.Session,
    component: () => import('./pages/SessionPage.vue'),
  },
  {
    path: RoutePath.Meals,
    name: RouteName.Meals,
    component: () => import('./pages/MealsPage.vue'),
  },
  {
    path: RoutePath.Progress,
    name: RouteName.Progress,
    component: () => import('./pages/ProgressPage.vue'),
  },
];

// Developer-only UI kit page. `import.meta.env.DEV` is a build-time constant, so a production
// build drops this branch and the page's chunk with it.
if (import.meta.env.DEV) {
  routes.push({
    path: RoutePath.DevUi,
    name: RouteName.DevUi,
    component: () => import('./dev/UiKitPage.vue'),
  });
}

export const router = createRouter({ history: createWebHistory(), routes });
