import type { ProgramExercise } from '@stamina/contracts';
import { Locale } from '@stamina/i18n';

/** The exercise's name in the person's language; Greek falls back to English until it is filled in. */
export function localizedName({ name }: Pick<ProgramExercise, 'name'>, locale: Locale): string {
  return (locale === Locale.El ? name.el : null) ?? name.en;
}
