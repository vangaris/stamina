/** The blocks a Session is shown in; the values are the i18n keys' last part (`program.blocks.<kind>`). */
export enum SessionBlockKind {
  WarmUp = 'warm-up',
  MainStrength = 'main-strength',
  SportSupport = 'sport-support',
  AccessoriesCore = 'accessories-core',
  /** The 30-minute Session shares one block between the sport-support and accessories slots. */
  SupportAccessories = 'support-accessories',
  CoolDown = 'cool-down',
}
