/** i18n keys the safety composables hand to their screens; the components translate them. */
export enum SafetyMessageKey {
  DisclaimerRequired = 'consent.disclaimer.error',
  HealthDataRequired = 'consent.healthData.error',
  ConsentOffline = 'consent.errors.offline',
  ConsentUnknown = 'consent.errors.unknown',
  AnswerRequired = 'screening.errors.answer',
  AreasRequired = 'screening.errors.areas',
  ScreeningOffline = 'screening.errors.offline',
  ScreeningUnknown = 'screening.errors.unknown',
  ReferredOffline = 'referred.errors.offline',
  ReferredUnknown = 'referred.errors.unknown',
}
