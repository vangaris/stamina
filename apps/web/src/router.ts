import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { UNGATED_ROUTES } from './config.ts';
import { useMediator } from './mediator.ts';
import { RouteName } from './enums/route-name.ts';
import { RoutePath } from './enums/route-path.ts';
import { TabId } from './enums/tab-id.ts';
import { createSafetyGuard } from './utils/create-safety-guard.ts';

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
    path: RoutePath.SessionDetail,
    name: RouteName.SessionDetail,
    props: true,
    component: () => import('./features/session/index.ts').then((m) => m.SessionContainer),
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
  {
    path: RoutePath.SignIn,
    name: RouteName.SignIn,
    component: () => import('./features/sign-in/index.ts').then((m) => m.SignInContainer),
  },
  {
    path: RoutePath.Start,
    name: RouteName.Start,
    component: () => import('./features/onboarding/index.ts').then((m) => m.StartContainer),
  },
  {
    path: RoutePath.Onboarding,
    name: RouteName.Onboarding,
    component: () => import('./features/onboarding/index.ts').then((m) => m.OnboardingContainer),
  },
  {
    path: RoutePath.Consent,
    name: RouteName.Consent,
    component: () => import('./features/safety/index.ts').then((m) => m.ConsentContainer),
  },
  {
    path: RoutePath.Screening,
    name: RouteName.Screening,
    component: () => import('./features/safety/index.ts').then((m) => m.ScreeningContainer),
  },
  {
    path: RoutePath.Referred,
    name: RouteName.Referred,
    component: () => import('./features/safety/index.ts').then((m) => m.ReferredContainer),
  },
  {
    path: RoutePath.Reveal,
    name: RouteName.Reveal,
    component: () => import('./features/program/index.ts').then((m) => m.RevealContainer),
  },
  {
    path: RoutePath.Week,
    name: RouteName.Week,
    component: () => import('./features/program/index.ts').then((m) => m.WeekContainer),
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

// Nobody reaches a screen outside the ungated list without onboarding, both consents and a
// Screening that allows training.
router.beforeEach(createSafetyGuard({ ungatedRoutes: UNGATED_ROUTES, mediator: useMediator }));
