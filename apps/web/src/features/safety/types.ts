import type { Mediator } from '@stamina/app-core';
import type { BodyArea, ScreeningQuestion } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { SavedScreening } from '@stamina/contracts';
import type { RoutePath } from '../../enums/route-path.ts';
import type { SafetyMessageKey } from './enums/safety-message-key.ts';
import type { SafetyPhase } from './enums/safety-phase.ts';
import type { ScreeningField } from './enums/screening-field.ts';

/** Every safety composable can leave its route; the container turns the path into a navigation. */
export interface SafetyRouteOptions {
  /** Called when the person belongs on another screen (or must sign in again). */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}

export interface UseConsentOptions extends SafetyRouteOptions {
  /** The language of the texts the person is reading. Defaults to the app's language. */
  locale?: () => Locale;
}

export interface UseScreeningOptions extends SafetyRouteOptions {
  /** Brings the first unanswered question into view. Defaults to scrolling its wrapper. */
  reveal?: (field: ScreeningQuestion | ScreeningField) => void;
}

export interface UseReferredOptions extends SafetyRouteOptions {
  /** Hands the exported data to the person. Defaults to a browser download. */
  save?: (fileName: string, data: unknown) => void;
}

/** One person's answers on the Screening page, as the page holds them: not yet validated. */
export interface ScreeningDraft {
  /** A question is missing from the record until it is answered: there is no default. */
  answers: Partial<Record<ScreeningQuestion, boolean>>;
  bodyAreas: BodyArea[];
  /** Whether they trained at least 3 times a week for 30 minutes or more for 3 months. */
  trainedRegularly: boolean | undefined;
}

export type ScreeningFieldKey = ScreeningQuestion | ScreeningField;

export type ScreeningErrors = Partial<Record<ScreeningFieldKey, SafetyMessageKey>>;

/** What the outcome screen reports about the Screening that was just saved. */
export interface ScreeningOutcomeView {
  screening: SavedScreening;
  /** The body-composition Goal was switched to General fitness. */
  goalChanged: boolean;
}

export interface ConsentErrors {
  disclaimer?: SafetyMessageKey;
  healthData?: SafetyMessageKey;
}

export interface ScreenFrameProps {
  title: string;
}

export interface ScreeningOutcomeProps {
  outcome: ScreeningOutcomeView;
}

export interface ScreeningOutcomeEmits {
  continue: [];
}

export interface QuestionFieldProps {
  /** The question as the person reads it (also the group's accessible name). */
  label: string;
  /** Show "If unsure, answer yes": the ten health questions do, the starting level does not. */
  unsure: boolean;
  /** `undefined` until answered. */
  answer: boolean | undefined;
  /** The translated message; empty when there is none. */
  error?: string | undefined;
}

export interface QuestionFieldEmits {
  update: [answer: boolean];
}

export interface SafetyGateProps {
  phase: SafetyPhase;
}

export interface SafetyGateEmits {
  retry: [];
}

export interface ReferredViewProps {
  isPregnancy: boolean;
  exported: boolean;
  busy: boolean;
  errorKey?: SafetyMessageKey | undefined;
}

export interface ReferredViewEmits {
  export: [];
  delete: [];
  'doctor-ok': [];
  'sign-out': [];
}

export interface DeleteConfirmProps {
  busy: boolean;
  errorKey?: SafetyMessageKey | undefined;
}

export interface DeleteConfirmEmits {
  confirm: [];
  cancel: [];
}

export interface LimitedNoticeEmits {
  continue: [];
}
