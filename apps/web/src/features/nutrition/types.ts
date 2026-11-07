import type { Mediator } from '@stamina/app-core';
import type { NutritionSetup, NutritionState, NutritionStatus } from '@stamina/contracts';
import type {
  Allergen,
  BodyDirection,
  CookingEffort,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  MealLogStatus,
  MealSlot,
  WaterAmount,
} from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { RoutePath } from '../../enums/route-path.ts';
import type { MealScope } from './enums/meal-scope.ts';
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
  /** Makes the id of a water or meal log. Defaults to a random id. */
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

/** One meal slot of the day, ready to draw in the person's language. */
export interface MealView {
  /** The place of the slot in the day: what a log of it is filed under. */
  index: number;
  slot: MealSlot;
  /** Clock time, "08:00". */
  time: string;
  /** The dish name, or undefined when there is no idea for the slot. */
  title: string | undefined;
  /** Ingredient lines, "2 tablespoons olive oil (20 g)"; empty without an idea. */
  portions: readonly string[];
  macros: { kcal: number; proteinG: number; carbsG: number; fatG: number } | undefined;
  status: MealLogStatus | null;
}

export interface MealButtonsProps {
  meal: MealView;
  /** Which card the buttons are on, to keep the test ids apart. */
  scope: MealScope;
}

export interface MealButtonsEmits {
  (event: 'log', index: number, status: MealLogStatus): void;
}

export interface NextMealCardProps {
  /** The meal to eat next, or undefined when every meal is logged. */
  meal: MealView | undefined;
  locale: Locale;
}

export interface NextMealCardEmits {
  (event: 'log', index: number, status: MealLogStatus): void;
}

export interface MealDayListProps {
  meals: readonly MealView[];
}

export interface MealDayListEmits {
  (event: 'log', index: number, status: MealLogStatus): void;
}
