import {
  AppError,
  AppErrorCode,
  acceptAdaptation,
  declineAdaptation,
  getAdaptations,
  getProgram,
  isQueued,
} from '@stamina/app-core';
import { AdaptationRejection, RecordStatus, type Adaptation } from '@stamina/contracts';
import { computed, ref, shallowRef } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { AdaptationCardState } from '../enums/adaptation-card-state.ts';
import { AdaptationLoadStatus } from '../enums/adaptation-load-status.ts';
import { AdaptationMessageKey } from '../enums/adaptation-message-key.ts';
import type { UseAdaptationsOptions } from '../types.ts';
import { toCardView } from '../utils/to-card-view.ts';

/**
 * The suggestions on Today: the pending ones from the server (or the device without signal), each
 * as a card the person accepts or declines. Nothing changes in the plan until accept. A decision
 * is sent once; with no signal it is queued on the device and the card shows it as decided. A
 * suggestion the plan has moved on from (stale) leaves the list with a note, and the list and the
 * week are asked for again so they show the plan as it is.
 */
export function useAdaptations(options: UseAdaptationsOptions) {
  const { onNavigate, weekdayLabel } = options;
  const mediator = options.mediator ?? useMediator();

  const status = ref(AdaptationLoadStatus.Loading);
  const adaptations = shallowRef<readonly Adaptation[]>([]);
  const states = ref<Record<string, AdaptationCardState>>({});
  /** Why the list changed under the person, or why a decision did not go through. */
  const noticeKey = ref<AdaptationMessageKey | undefined>();

  const cards = computed(() =>
    adaptations.value.map((adaptation) =>
      toCardView(
        adaptation,
        states.value[adaptation.id] ?? AdaptationCardState.Pending,
        weekdayLabel,
      ),
    ),
  );

  function setState(id: string, state: AdaptationCardState) {
    states.value = { ...states.value, [id]: state };
  }

  function drop(id: string) {
    adaptations.value = adaptations.value.filter((adaptation) => adaptation.id !== id);
  }

  /** Returns true when the person has to sign in again (and has been sent there). */
  function signedOut(error: unknown): boolean {
    if (!(error instanceof AppError) || error.code !== AppErrorCode.Unauthorized) return false;
    onNavigate(ROUTE_WHEN_SIGNED_OUT);
    return true;
  }

  async function load() {
    try {
      adaptations.value = await mediator.send(getAdaptations());
      status.value = AdaptationLoadStatus.Ready;
    } catch (error) {
      // Suggestions are optional: without them the screen simply shows none.
      if (signedOut(error)) return;
      status.value = AdaptationLoadStatus.Unavailable;
    }
  }

  /** The week as it is now: asking also refreshes the cache the week view reads. */
  async function refresh() {
    await Promise.all([load(), mediator.send(getProgram()).catch(() => undefined)]);
  }

  async function decide(adaptation: Adaptation, send: () => Promise<void>) {
    // One decision per card: while it is sent, and once it is queued.
    if (
      (states.value[adaptation.id] ?? AdaptationCardState.Pending) !== AdaptationCardState.Pending
    )
      return;
    setState(adaptation.id, AdaptationCardState.Busy);
    noticeKey.value = undefined;
    try {
      await send();
    } catch (error) {
      setState(adaptation.id, AdaptationCardState.Pending);
      if (signedOut(error)) return;
      noticeKey.value = AdaptationMessageKey.Failed;
    }
  }

  function find(id: string): Adaptation | undefined {
    return adaptations.value.find((adaptation) => adaptation.id === id);
  }

  async function accept(id: string) {
    const adaptation = find(id);
    if (!adaptation) return;
    await decide(adaptation, async () => {
      const result = await mediator.send(acceptAdaptation(adaptation));
      if (isQueued(result)) return setState(id, AdaptationCardState.Queued);
      drop(id);
      if (result.status === RecordStatus.Rejected && result.reason === AdaptationRejection.Stale) {
        noticeKey.value = AdaptationMessageKey.Stale;
      }
      await refresh();
    });
  }

  async function decline(id: string) {
    const adaptation = find(id);
    if (!adaptation) return;
    await decide(adaptation, async () => {
      const result = await mediator.send(declineAdaptation(id));
      if (isQueued(result)) return setState(id, AdaptationCardState.Queued);
      drop(id);
      if (result.status === RecordStatus.Rejected) await refresh();
    });
  }

  return { status, cards, noticeKey, load, accept, decline };
}
