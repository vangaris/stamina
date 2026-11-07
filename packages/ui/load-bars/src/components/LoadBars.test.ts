import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { LoadBarsProps } from '../types.ts';
import LoadBars from './LoadBars.vue';

const base: LoadBarsProps = {
  weeks: [
    { label: 'Oct 12', done: 120, planned: 0 },
    { label: 'Oct 19', done: 90, planned: 0 },
    { label: 'This week', done: 60, planned: 50, current: true },
  ],
  average: 100,
  label: 'Weekly Load',
  averageLabel: 'Your usual',
  doneLabel: 'Done',
  plannedLabel: 'Planned',
  weekLabel: 'Week',
  currentLabel: 'this week',
  locale: 'en',
};

const render = (extra: Partial<LoadBarsProps> = {}) =>
  mount(LoadBars, { props: { ...base, ...extra } });

describe('LoadBars', () => {
  it('gives every week done, planned and the average in a named text alternative', () => {
    const w = render();
    expect(w.get('caption').text()).toBe('Weekly Load');
    const rows = w.findAll('tbody tr').map((r) => r.findAll('th,td').map((c) => c.text()));
    expect(rows).toEqual([
      ['Oct 12', '120', '0'],
      ['Oct 19', '90', '0'],
      ['This week (this week)', '60', '50'],
      ['Your usual', '100'],
    ]);
  });

  it('writes the numbers in the given language', () => {
    const rows = render({
      locale: 'el',
      weeks: [{ label: 'Nov 2', done: 1840, planned: 0, current: true }],
      average: 1600,
    })
      .findAll('tbody tr')
      .map((r) => r.findAll('th,td').map((c) => c.text()));
    expect(rows).toEqual([
      ['Nov 2 (this week)', '1.840', '0'],
      ['Your usual', '1.600'],
    ]);
  });

  it('has no average row when average is null', () => {
    const w = render({ average: null });
    expect(w.findAll('tbody tr')).toHaveLength(3);
    expect(w.text()).not.toContain('Your usual');
  });

  it('shows the average label visibly only when there is an average', () => {
    expect(render().get('[aria-hidden="true"]').text()).toContain('Your usual');
    expect(render({ average: null }).get('[aria-hidden="true"]').text()).not.toContain(
      'Your usual',
    );
  });

  it('shows each week label visibly', () => {
    const text = render().get('[aria-hidden="true"]').text();
    for (const l of ['Oct 12', 'Oct 19', 'This week']) expect(text).toContain(l);
  });

  it('renders with no weeks', () => {
    expect(render({ weeks: [], average: null }).findAll('tbody tr')).toHaveLength(0);
  });

  it.each([
    ['with average', {}],
    ['without average', { average: null }],
    ['empty', { weeks: [], average: null }],
    ['all zero', { weeks: [{ label: 'W', done: 0, planned: 0 }], average: 0 }],
  ])('has no axe violations (%s)', async (_n, extra) => {
    await expectNoA11yViolations(render(extra as Partial<LoadBarsProps>).element);
  });
});
