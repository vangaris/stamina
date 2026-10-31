import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { ProgressBarSize } from '../enums/progress-bar-size.ts';
import { ProgressBarTone } from '../enums/progress-bar-tone.ts';
import ProgressBar from './ProgressBar.vue';

const bar = (props: Record<string, unknown>, slots: Record<string, string> = {}) => {
  const wrapper = mount(ProgressBar, { props: { label: 'Sessions', ...props } as never, slots });
  return { wrapper, el: wrapper.get('[role="progressbar"]') };
};

describe('ProgressBar', () => {
  it('exposes value, range and human text', () => {
    const { el } = bar({ value: 2, max: 3, valueText: '2 of 3 sessions' });
    expect(el.attributes()).toMatchObject({
      'aria-valuemin': '0',
      'aria-valuemax': '3',
      'aria-valuenow': '2',
      'aria-valuetext': '2 of 3 sessions',
    });
  });

  it('defaults to a 0-100 range and omits valuetext when not given', () => {
    const { el } = bar({ value: 40 });
    expect(el.attributes()).toMatchObject({ 'aria-valuemin': '0', 'aria-valuemax': '100' });
    expect(el.attributes('aria-valuetext')).toBeUndefined();
  });

  it('handles zero and full', () => {
    expect(bar({ value: 0 }).el.attributes('aria-valuenow')).toBe('0');
    expect(bar({ value: 100 }).el.attributes('aria-valuenow')).toBe('100');
  });

  it('clamps over-max values to max, and below-min values to min', () => {
    expect(bar({ value: 150, max: 100 }).el.attributes('aria-valuenow')).toBe('100');
    expect(bar({ value: -5 }).el.attributes('aria-valuenow')).toBe('0');
    expect(bar({ value: 2, min: 5, max: 10 }).el.attributes('aria-valuenow')).toBe('5');
  });

  it('keeps the fill inside the track when over max', () => {
    const { el } = bar({ value: 500, max: 100 });
    expect((el.element.firstElementChild as HTMLElement).style.width).toBe('100%');
  });

  it('sizes the fill by the ratio within min..max', () => {
    const { el } = bar({ value: 15, min: 10, max: 20 });
    expect((el.element.firstElementChild as HTMLElement).style.width).toBe('50%');
  });

  it('uses label as the accessible name', () => {
    const { wrapper, el } = bar({ value: 1 });
    expect(el.attributes('aria-label')).toBe('Sessions');
    expect(wrapper.find('[id]').exists()).toBe(false);
  });

  it('names the bar by the visible label when showLabel is set', () => {
    const { wrapper, el } = bar({ value: 1, showLabel: true });
    const id = el.attributes('aria-labelledby');
    expect(id).toBeTruthy();
    expect(el.attributes('aria-label')).toBeUndefined();
    expect(wrapper.get(`[id="${id}"]`).text()).toBe('Sessions');
  });

  it('renders the caption slot as visible text', () => {
    const { wrapper } = bar({ value: 2, max: 3 }, { caption: '2 / 3' });
    expect(wrapper.text()).toContain('2 / 3');
  });

  it.each([
    { max: 0 },
    { max: Number.NaN },
    { max: -3 },
    { min: Number.NaN },
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
  ])('does not throw and stays valid for %o', (extra) => {
    const { el } = bar({ value: 5, max: 10, ...extra });
    const min = Number(el.attributes('aria-valuemin'));
    const max = Number(el.attributes('aria-valuemax'));
    const now = Number(el.attributes('aria-valuenow'));
    expect(Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(now)).toBe(true);
    expect(max).toBeGreaterThan(min);
    expect(now).toBeGreaterThanOrEqual(min);
    expect(now).toBeLessThanOrEqual(max);
  });

  it.each(Object.values(ProgressBarTone))('has no axe violations (%s)', async (tone) => {
    const { wrapper } = bar(
      { value: 2, max: 3, tone, valueText: '2 of 3', showLabel: true },
      {
        caption: '2 / 3',
      },
    );
    await expectNoA11yViolations(wrapper.element);
  });

  it('has no axe violations without a visible label, empty and over max', async () => {
    await expectNoA11yViolations(bar({ value: 0, size: ProgressBarSize.Sm }).wrapper.element);
    await expectNoA11yViolations(bar({ value: 200 }).wrapper.element);
  });
});
