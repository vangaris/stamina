import { describe, expect, it, vi } from 'vitest';
import { ProgramMessageKey } from '../enums/program-message-key.ts';
import { ProgramPhase } from '../enums/program-phase.ts';
import { setupProgram } from '../testing/setup-program.ts';
import { useWeekView } from './useWeekView.ts';

describe('useWeekView', () => {
  it('lists the stored week by date, free days included', async () => {
    const { mediator, services } = await setupProgram();
    await services.api.createProgram();
    const flow = useWeekView({ onNavigate: vi.fn(), mediator });

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Ready);
    expect(flow.days.value).toHaveLength(7);
    expect(flow.days.value.filter(({ session }) => session)).toHaveLength(3);
  });

  it('says there is no Program yet instead of creating one', async () => {
    const { mediator, services } = await setupProgram();
    const flow = useWeekView({ onNavigate: vi.fn(), mediator });

    await flow.load();

    expect(flow.phase.value).toBe(ProgramPhase.Unavailable);
    expect(flow.messageKey.value).toBe(ProgramMessageKey.NoProgramYet);
    expect(await services.api.getProgram()).toBeNull();
  });
});
