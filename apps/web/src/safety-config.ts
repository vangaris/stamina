import { SafetyStatus } from '@stamina/app-core';
import { RoutePath } from './enums/route-path.ts';

/**
 * Where each stage of the safety flow lives; `Ready` is the app itself.
 * Kept out of `config.ts`, which `vite.config.ts` loads in plain Node (no workspace packages).
 */
export const ROUTE_FOR_SAFETY: Record<SafetyStatus, RoutePath> = {
  [SafetyStatus.ProfileNeeded]: RoutePath.Onboarding,
  [SafetyStatus.ConsentNeeded]: RoutePath.Consent,
  [SafetyStatus.ScreeningNeeded]: RoutePath.Screening,
  [SafetyStatus.Referred]: RoutePath.Referred,
  [SafetyStatus.Paused]: RoutePath.Paused,
  [SafetyStatus.Ready]: RoutePath.Today,
};
