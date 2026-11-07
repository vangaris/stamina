import {
  AppError,
  AppErrorCode,
  ProfileStatus,
  getProfile,
  saveNutritionSetup,
} from '@stamina/app-core';
import { SaveNutritionSetupRejection, SaveNutritionSetupStatus } from '@stamina/contracts';
import { Goal, MAX_DISLIKES } from '@stamina/domain';
import { computed, nextTick, ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { ROUTE_WHEN_SIGNED_OUT, UNLOCK_ERROR_KEYS } from '../config.ts';
import { UnlockMessageKey } from '../enums/unlock-message-key.ts';
import { UnlockStatus } from '../enums/unlock-status.ts';
import type { UnlockField } from '../enums/unlock-field.ts';
import type { UnlockDraft, UseUnlockMealsOptions } from '../types.ts';
import { addDislike } from '../utils/add-dislike.ts';
import { DISLIKE_INPUT_ID, focusById, focusUnlockField } from '../utils/focus-unlock-field.ts';
import { toEmptyDraft } from '../utils/to-empty-draft.ts';
import { toNutritionSetup } from '../utils/to-nutrition-setup.ts';

const MESSAGE_FOR_REJECTION: Record<SaveNutritionSetupRejection, UnlockMessageKey> = {
  [SaveNutritionSetupRejection.NutritionOff]: UnlockMessageKey.NutritionOff,
  [SaveNutritionSetupRejection.BodyDirectionNotAllowed]: UnlockMessageKey.DirectionNotAllowed,
};

/**
 * The Unlock Meals form: the draft, what is still missing, and saving it. Lose fat or gain
 * muscle is only asked when the person's Goal is about their body. Saving does not need a
 * connection to be retried safely, but it does need one to be sent. Nothing the person types is
 * logged.
 */
export function useUnlockMeals(options: UseUnlockMealsOptions) {
  const mediator = options.mediator ?? useMediator();

  const draft = ref<UnlockDraft>(toEmptyDraft());
  const askDirection = ref(false);
  const missing = ref<UnlockField[]>([]);
  const status = ref(UnlockStatus.Idle);
  const messageKey = ref<UnlockMessageKey | undefined>();
  const saving = computed(() => status.value === UnlockStatus.Saving);

  /** Reads the person's Goal, to know whether to ask about lose fat or gain muscle. */
  async function load() {
    try {
      const state = await mediator.send(getProfile());
      askDirection.value =
        state.status === ProfileStatus.Present && state.profile.goal === Goal.BodyComposition;
    } catch {
      askDirection.value = false;
    }
  }

  /** Puts focus where the person types a dislike, after the page has drawn the change. */
  async function focusDislikeInput() {
    await nextTick();
    focusById(DISLIKE_INPUT_ID);
  }

  function add() {
    draft.value.dislikes = addDislike(draft.value.dislikes, draft.value.dislikeText);
    draft.value.dislikeText = '';
    // The list at its limit locks the input; focus stays on the input rather than a lost button.
    if (draft.value.dislikes.length >= MAX_DISLIKES) void focusDislikeInput();
  }

  function remove(dislike: string) {
    draft.value.dislikes = draft.value.dislikes.filter((item) => item !== dislike);
    void focusDislikeInput();
  }

  async function submit() {
    if (saving.value) return;
    // A dislike typed but not added yet still counts.
    if (draft.value.dislikeText.trim()) add();
    messageKey.value = undefined;
    const result = toNutritionSetup(draft.value, askDirection.value);
    if ('missing' in result) {
      missing.value = result.missing;
      const [first] = result.missing;
      if (first) {
        await nextTick();
        focusUnlockField(first);
      }
      return;
    }
    missing.value = [];
    status.value = UnlockStatus.Saving;
    try {
      const saved = await mediator.send(saveNutritionSetup(result.setup));
      if (saved.status === SaveNutritionSetupStatus.Saved) {
        status.value = UnlockStatus.Idle;
        await options.onSaved();
        return;
      }
      messageKey.value = MESSAGE_FOR_REJECTION[saved.reason];
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        options.onNavigate(ROUTE_WHEN_SIGNED_OUT);
        return;
      }
      messageKey.value = toMessageKey(error, UNLOCK_ERROR_KEYS, UnlockMessageKey.Failed);
    }
    status.value = UnlockStatus.Failed;
  }

  return { draft, askDirection, missing, status, messageKey, saving, load, add, remove, submit };
}
