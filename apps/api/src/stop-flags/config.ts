import { PAUSING_STOP_ACTIONS, STOP_FLAG_EFFECTS, StopFlag } from '@stamina/domain';

/** The flags whose effect pauses training until a doctor has seen or cleared the person. */
export const PAUSING_FLAGS: readonly StopFlag[] = Object.values(StopFlag).filter((flag) =>
  PAUSING_STOP_ACTIONS.includes(STOP_FLAG_EFFECTS[flag].action),
);
