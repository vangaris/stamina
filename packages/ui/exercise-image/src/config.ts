/** The image box keeps this ratio before and after the image loads, so nothing shifts. */
export const EXERCISE_IMAGE_BOX_CLASSES =
  'aspect-4/3 w-full overflow-hidden rounded-lg border border-border bg-surface-sunken';

/** Attribution links leave the app (and a session in progress) for another tab. */
export const ATTRIBUTION_LINK_TARGET = '_blank';
/** `noreferrer` also keeps the app's address from reaching wger or the author. */
export const ATTRIBUTION_LINK_REL = 'noopener noreferrer';

export const ATTRIBUTION_LINK_CLASSES =
  'inline-flex min-h-tap min-w-tap items-center rounded-md underline focus-ring';
