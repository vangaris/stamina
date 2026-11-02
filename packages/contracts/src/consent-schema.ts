import { ConsentPurpose } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { z } from 'zod';

/** One consent given: which purpose, in the language of the text the person read. */
export const consentGrantSchema = z.object({
  purpose: z.enum(ConsentPurpose),
  locale: z.enum(Locale),
});

/** The purposes currently granted at the current text version. */
export const consentStateSchema = z.object({
  granted: z.array(z.enum(ConsentPurpose)),
});
