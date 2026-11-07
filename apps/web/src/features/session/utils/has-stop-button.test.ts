import { describe, expect, it } from 'vitest';
import { SessionPhase } from '../enums/session-phase.ts';
import { hasStopButton } from './has-stop-button.ts';

describe('hasStopButton', () => {
  it.each([SessionPhase.Focus, SessionPhase.Overview, SessionPhase.Finish])(
    'shows the Stop button while the person trains: %s',
    (phase) => {
      expect(hasStopButton(phase)).toBe(true);
    },
  );

  it.each([SessionPhase.Loading, SessionPhase.Failed, SessionPhase.Done])(
    'hides it when there is nothing to stop: %s',
    (phase) => {
      expect(hasStopButton(phase)).toBe(false);
    },
  );
});
