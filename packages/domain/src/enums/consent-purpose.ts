/** What a consent record covers. Each purpose is accepted separately. */
export enum ConsentPurpose {
  /** The wellness disclaimer: Stamina is not a medical service. */
  Disclaimer = 'disclaimer',
  /** Explicit consent to process health data (GDPR Art. 9(2)(a)). Never pre-ticked. */
  HealthData = 'health-data',
}
