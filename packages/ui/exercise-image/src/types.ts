import type { Ref } from 'vue';

export interface ImageFailure {
  failed: Ref<boolean>;
  /** Wire to the image's `error` event. */
  onError(): void;
}

export interface ExerciseImageProps {
  /** The wger image URL, unmodified (never a copy or a thumbnail made by Stamina). */
  src: string;
  /** Describes the movement for assistive technology. */
  alt: string;
  /** Who made the image (the licence asks for it to be shown). */
  author: string;
  /** The author's page when wger gives one; the author is plain text without it. */
  authorUrl?: string | null | undefined;
  /** Short licence name, shown as the text of the licence link ("CC-BY-SA 4.0"). */
  licence: string;
  licenceUrl: string;
  /** The wger page the image comes from. */
  sourceUrl: string;
  /** Introduces the author ("Image by"). */
  authorLabel: string;
  /** Text of the source link ("Source: wger"). */
  sourceLabel: string;
  /** Read out after each link, which opens in a new tab ("opens in a new tab"). */
  newTabLabel: string;
  /** Shown in place of the image when it cannot be loaded; the attribution stays, so nothing shifts. */
  unavailableLabel: string;
}
