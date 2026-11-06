import { SetDotState } from './enums/set-dot-state.ts';

export const SET_DOT_CLASSES: Record<SetDotState, string> = {
  [SetDotState.Done]: 'border-accent bg-accent',
  [SetDotState.Current]: 'border-2 border-accent bg-accent-soft',
  [SetDotState.Pending]: 'border-border-strong bg-surface',
};
