/**
 * A warning symptom a person can report in the Check-in or with a Session's Stop button. The wire
 * value names the symptom as the person would, never a condition. Wording lives in
 * `@stamina/i18n`; what each one does is `STOP_FLAG_EFFECTS` and `stopFlagEffect`.
 */
export enum StopFlag {
  ChestPain = 'chest-pain',
  Fainting = 'fainting',
  Breathlessness = 'breathlessness',
  Heartbeat = 'heartbeat',
  Fever = 'fever',
  NewPain = 'new-pain',
  HeadKnock = 'head-knock',
}
