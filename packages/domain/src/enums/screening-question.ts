/**
 * The ten yes/no Screening questions. The wire value names the topic, never the position, so
 * reordering the page changes nothing stored. Wording lives in `@stamina/i18n`; the outcome each
 * answer drives is in `config.ts` and `evaluateScreening`.
 */
export enum ScreeningQuestion {
  HeartCondition = 'heart-condition',
  ChestPain = 'chest-pain',
  Fainting = 'fainting',
  DiabetesOrKidney = 'diabetes-or-kidney',
  Breathing = 'breathing',
  BoneJointMuscle = 'bone-joint-muscle',
  HeadInjury = 'head-injury',
  Pregnancy = 'pregnancy',
  SupervisedExercise = 'supervised-exercise',
  EatingDisorder = 'eating-disorder',
}
