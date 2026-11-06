import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { SetDotState } from '../enums/set-dot-state.ts';
import SetDots from './SetDots.vue';

const dots = (props: Record<string, unknown>) =>
  mount(SetDots, { props: { label: 'Set 2 of 4', total: 4, done: 1, ...props } as never });

const states = (w: ReturnType<typeof dots>) =>
  w.findAll('[data-state]').map((d) => d.attributes('data-state'));

describe('SetDots', () => {
  it('is one image named by the label', () => {
    const w = dots({});
    const img = w.get('[role="img"]');
    expect(img.attributes('aria-label')).toBe('Set 2 of 4');
  });

  it('renders a dot per planned set with done, current and pending states', () => {
    expect(states(dots({ current: 1 }))).toEqual([
      SetDotState.Done,
      SetDotState.Current,
      SetDotState.Pending,
      SetDotState.Pending,
    ]);
  });

  it('highlights nothing without current', () => {
    expect(states(dots({ done: 2 }))).toEqual([
      SetDotState.Done,
      SetDotState.Done,
      SetDotState.Pending,
      SetDotState.Pending,
    ]);
  });

  it('updates as sets are logged', async () => {
    const w = dots({ done: 0, current: 0 });
    await w.setProps({ done: 4, current: undefined });
    expect(states(w)).toEqual(Array(4).fill(SetDotState.Done));
  });

  it('shows no dots for no sets but keeps the label', () => {
    const w = dots({ total: 0, done: 0 });
    expect(states(w)).toEqual([]);
    expect(w.get('[role="img"]').attributes('aria-label')).toBe('Set 2 of 4');
  });

  it('has no text of its own', () => {
    expect(dots({}).text()).toBe('');
  });

  it.each([
    ['none done', { done: 0, current: 0 }],
    ['partly done', { done: 2, current: 2 }],
    ['all done', { done: 4 }],
    ['no sets', { total: 0, done: 0 }],
  ])('has no axe violations (%s)', async (_name, props) => {
    await expectNoA11yViolations(dots(props).element);
  });
});
