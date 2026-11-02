import type { BodyArea } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';

/** "Knee, hip and ankle" in the person's language; `name` gives each area's own words. */
export function formatAreaList(
  areas: readonly BodyArea[],
  name: (area: BodyArea) => string,
  locale: Locale,
): string {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
    areas.map((area) => name(area).toLocaleLowerCase(locale)),
  );
}
