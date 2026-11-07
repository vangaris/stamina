export { default as ConsentContainer } from './components/ConsentContainer.vue';
export { default as RedsCard } from './components/RedsCard.vue';
export { default as QuestionField } from './components/QuestionField.vue';
export { default as ReferredContainer } from './components/ReferredContainer.vue';
export { default as SafetyGate } from './components/SafetyGate.vue';
export { default as ScreeningContainer } from './components/ScreeningContainer.vue';
export { AREA_QUESTION, BODY_AREAS } from './config.ts';
export { useConsent } from './composables/useConsent.ts';
export { useReferred } from './composables/useReferred.ts';
export { useSafetyRoute } from './composables/useSafetyRoute.ts';
export { useScreening } from './composables/useScreening.ts';
export { ReferredView } from './enums/referred-view.ts';
export { SafetyMessageKey } from './enums/safety-message-key.ts';
export { SafetyPhase } from './enums/safety-phase.ts';
export { ScreeningField } from './enums/screening-field.ts';
export { ScreeningView } from './enums/screening-view.ts';
export { applyAnswer } from './utils/apply-answer.ts';
export { createScreeningDraft } from './utils/create-screening-draft.ts';
export type {
  ConsentErrors,
  ScreeningDraft,
  ScreeningErrors,
  ScreeningFieldKey,
  SafetyRouteOptions,
  ScreeningOutcomeView,
  UseConsentOptions,
  UseReferredOptions,
  UseScreeningOptions,
} from './types.ts';
