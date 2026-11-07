import type { Mediator } from '@stamina/app-core';
import type { NutritionSetup, NutritionState, NutritionStatus } from '@stamina/contracts';
import type {
  Allergen,
  BodyDirection,
  CookingEffort,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  WaterAmount,
} from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { RoutePath } from '../../enums/route-path.ts';
import type { UnlockField } from './enums/unlock-field.ts';
import type { UnlockMessageKey } from './enums/unlock-message-key.ts';
import type { UnlockStatus } from './enums/unlock-status.ts';

/** The nutrition of a day that is ready: targets, water and the rate-check lines. */
export type ReadyNutrition = Extract<NutritionState, { status: NutritionStatus.Ready }>;

/** The setup a filled-in form stands for, or the inputs that are missing or not usable. */
export type SetupResult = { setup: NutritionSetup } | { missing: UnlockField[] };

export interface UseNutritionOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
  /** Makes the id of a water log. Defaults to a random id. */
  newId?: () => string;
}

export interface UseUnlockMealsOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** Called once the setup is saved, to read the day again for the person's calendar day. */
  onSaved: () => void | Promise<void>;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}

/** What the Unlock Meals form holds while it is filled in; typed numbers stay text until saved. */
export interface UnlockDraft {
  sex: EnergySex | null;
  height: string;
  weight: string;
  everydayActivity: EverydayActivity | null;
  eatingPattern: EatingPattern;
  allergens: Allergen[];
  dislikes: string[];
  /** The dislike being typed, not added yet. */
  dislikeText: string;
  mealsPerDay: number;
  cookingEffort: CookingEffort;
  bodyDirection: BodyDirection | null;
}

export interface UnlockMealsFormProps {
  /** The Goal is about the person's body: they say lose fat or gain muscle. */
  askDirection: boolean;
  /** Inputs that need an answer, shown with their error. */
  missing: readonly UnlockField[];
  status: UnlockStatus;
  messageKey: UnlockMessageKey | undefined;
}

export interface UnlockMealsFormEmits {
  (event: 'submit'): void;
  (event: 'addDislike'): void;
  (event: 'removeDislike', dislike: string): void;
}

export interface TargetsCardProps {
  nutrition: ReadyNutrition;
  locale: Locale;
}

export interface HydrationCardProps {
  nutrition: ReadyNutrition;
  locale: Locale;
  /** Said when a water log did not go through. */
  failedKey: string | undefined;
}

export interface HydrationCardEmits {
  (event: 'log', amount: WaterAmount): void;
}
