import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import Stepper from './Stepper.vue';

let wrapper: ReturnType<typeof mountStepper>;
afterEach(() => wrapper.unmount());

function mountStepper(props: Record<string, unknown> = {}) {
  const w = mount(Stepper, {
    props: {
      label: 'Weight',
      decrementLabel: 'Decrease weight',
      incrementLabel: 'Increase weight',
      modelValue: 60,
      'onUpdate:modelValue': (v: number) => void w.setProps({ modelValue: v }),
      ...props,
    },
    attachTo: document.body,
  });
  return w;
}
const setup = (props: Record<string, unknown> = {}) => (wrapper = mountStepper(props));

const minus = () => wrapper.get('button[aria-label="Decrease weight"]');
const plus = () => wrapper.get('button[aria-label="Increase weight"]');
const spin = () => wrapper.get('[role="spinbutton"]');
const emitted = () => (wrapper.emitted('update:modelValue') ?? []).map((e) => e[0]);
const press = (key: string) => spin().trigger('keydown', { key });

describe('Stepper values', () => {
  it('increments and decrements by the step', async () => {
    setup({ step: 5 });
    await plus().trigger('click');
    await plus().trigger('click');
    await minus().trigger('click');
    expect(emitted()).toEqual([65, 70, 65]);
    expect(spin().attributes('aria-valuenow')).toBe('65');
  });

  it('defaults to a step of 1', async () => {
    setup({ modelValue: 8 });
    await plus().trigger('click');
    expect(emitted()).toEqual([9]);
  });

  it('keeps fractional steps free of floating point drift', async () => {
    setup({ modelValue: 0.1, step: 0.1 });
    await plus().trigger('click'); // 0.1 + 0.1
    await plus().trigger('click'); // 0.2 + 0.1 = 0.30000000000000004 in raw floats
    expect(emitted()).toEqual([0.2, 0.3]);

    await wrapper.setProps({ modelValue: 60, step: 2.5 });
    await plus().trigger('click');
    await plus().trigger('click');
    await minus().trigger('click');
    expect(emitted().slice(2)).toEqual([62.5, 65, 62.5]);
  });

  it('removes drift when the stored value already has decimals', async () => {
    setup({ modelValue: 0.3, step: 0.1 });
    await minus().trigger('click');
    await minus().trigger('click');
    expect(emitted()).toEqual([0.2, 0.1]);
  });

  it('clamps a step that overshoots a bound to the bound', async () => {
    setup({ modelValue: 98, min: 0, max: 100, step: 5 });
    await plus().trigger('click');
    expect(emitted()).toEqual([100]);
    await wrapper.setProps({ modelValue: 2 });
    await minus().trigger('click');
    expect(emitted().at(-1)).toBe(0);
  });

  it('pulls an out-of-range value back into range', async () => {
    setup({ modelValue: 150, min: 0, max: 100 });
    await minus().trigger('click');
    expect(emitted()).toEqual([100]);
  });
});

describe('Stepper bounds', () => {
  it('cannot step past the maximum, and the plus button says so', async () => {
    setup({ modelValue: 29, min: 1, max: 30 });
    await plus().trigger('click');
    expect(emitted()).toEqual([30]);
    expect(plus().attributes('aria-disabled')).toBe('true');
    await plus().trigger('click');
    expect(emitted()).toEqual([30]);
    expect(minus().attributes('aria-disabled')).toBeUndefined();
  });

  it('cannot step below the minimum, and the minus button says so', async () => {
    setup({ modelValue: 2, min: 1, max: 30 });
    await minus().trigger('click');
    expect(emitted()).toEqual([1]);
    expect(minus().attributes('aria-disabled')).toBe('true');
    await minus().trigger('click');
    expect(emitted()).toEqual([1]);
    expect(plus().attributes('aria-disabled')).toBeUndefined();
  });

  it('keeps focus on a button that reaches its bound', async () => {
    setup({ modelValue: 29, min: 1, max: 30 });
    (plus().element as HTMLElement).focus();
    await plus().trigger('click');
    expect(document.activeElement).toBe(plus().element);
    expect(plus().attributes('disabled')).toBeUndefined();
  });

  it('has no bounds unless asked to', async () => {
    setup({ modelValue: 0 });
    await minus().trigger('click');
    expect(emitted()).toEqual([-1]);
    expect(spin().attributes('aria-valuemin')).toBeUndefined();
    expect(spin().attributes('aria-valuemax')).toBeUndefined();
  });
});

describe('Stepper keyboard', () => {
  it('the value is the single tab stop; the buttons are reachable by assistive tech only', () => {
    setup();
    expect(spin().attributes('tabindex')).toBe('0');
    expect(plus().attributes('tabindex')).toBe('-1');
    expect(minus().attributes('tabindex')).toBe('-1');
  });

  it('Arrow Up / Down step the value and prevent page scrolling', async () => {
    setup({ step: 2.5, min: 0, max: 200 });
    const up = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
    spin().element.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);
    await nextTick();
    await press('ArrowDown');
    await press('ArrowDown');
    expect(emitted()).toEqual([62.5, 60, 57.5]);
  });

  it('Home and End jump to the bounds', async () => {
    setup({ min: 1, max: 30, modelValue: 10 });
    await press('End');
    await press('Home');
    expect(emitted()).toEqual([30, 1]);
  });

  it('Home and End do nothing without bounds, and other keys are left alone', async () => {
    setup();
    const end = new KeyboardEvent('keydown', { key: 'End', cancelable: true });
    spin().element.dispatchEvent(end);
    const letter = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    spin().element.dispatchEvent(letter);
    expect(emitted()).toEqual([]);
    expect(end.defaultPrevented).toBe(false);
    expect(letter.defaultPrevented).toBe(false);
  });

  it('ignores arrow keys at a bound', async () => {
    setup({ modelValue: 30, max: 30 });
    await press('ArrowUp');
    expect(emitted()).toEqual([]);
  });

  it('the buttons never submit a surrounding form', () => {
    setup();
    expect(plus().attributes('type')).toBe('button');
  });
});

describe('Stepper display and names', () => {
  it('names the spinbutton by its visible label and exposes value, range and text', () => {
    setup({ modelValue: 12, min: 1, max: 30, unit: 'reps' });
    const s = spin();
    const label = wrapper.get(`#${CSS.escape(s.attributes('aria-labelledby')!)}`);
    expect(label.text()).toBe('Weight');
    expect(s.attributes('aria-valuenow')).toBe('12');
    expect(s.attributes('aria-valuemin')).toBe('1');
    expect(s.attributes('aria-valuemax')).toBe('30');
    expect(s.attributes('aria-valuetext')).toBe('12 reps');
    expect(s.text()).toContain('12');
    expect(s.text()).toContain('reps');
  });

  it('shows and reads the formatted value (Greek decimal comma) but emits plain numbers', async () => {
    const format = (v: number) =>
      new Intl.NumberFormat('el-GR', { minimumFractionDigits: 1 }).format(v);
    setup({ modelValue: 62.5, step: 2.5, unit: 'kg', format });
    expect(spin().text()).toContain('62,5');
    expect(spin().text()).not.toContain('62.5');
    expect(spin().attributes('aria-valuetext')).toBe('62,5 kg');
    expect(spin().attributes('aria-valuenow')).toBe('62.5');
    await plus().trigger('click');
    expect(emitted()).toEqual([65]);
    expect(spin().text()).toContain('65,0');
  });

  it('uses the caller-supplied names for the buttons', () => {
    setup({ decrementLabel: 'Μείωση βάρους', incrementLabel: 'Αύξηση βάρους' });
    expect(wrapper.find('button[aria-label="Μείωση βάρους"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Αύξηση βάρους"]').exists()).toBe(true);
  });

  it('works without a unit', () => {
    setup({ modelValue: 8 });
    expect(spin().attributes('aria-valuetext')).toBe('8');
  });
});

describe('Stepper announcements', () => {
  const live = () => wrapper.get('[aria-live="polite"]');

  it('announces a new value politely after a button press', async () => {
    setup({ unit: 'kg', step: 2.5 });
    expect(live().text()).toBe('');
    await plus().trigger('click');
    expect(live().text()).toBe('62.5 kg');
    await minus().trigger('click');
    await minus().trigger('click');
    expect(live().text()).toBe('57.5 kg');
  });

  it('does not announce when nothing changed', async () => {
    setup({ modelValue: 30, max: 30 });
    await plus().trigger('click');
    expect(live().text()).toBe('');
  });

  it('leaves announcing keyboard changes to the spinbutton itself, to avoid a double read', async () => {
    setup();
    await press('ArrowUp');
    expect(live().text()).toBe('');
    expect(spin().attributes('aria-valuetext')).toBe('61');
  });
});

describe('Stepper disabled', () => {
  it('ignores every input', async () => {
    setup({ disabled: true });
    await plus().trigger('click');
    await minus().trigger('click');
    await press('ArrowUp');
    await press('Home');
    expect(emitted()).toEqual([]);
    expect(plus().attributes('disabled')).toBeDefined();
    expect(minus().attributes('disabled')).toBeDefined();
    expect(spin().attributes('aria-disabled')).toBe('true');
    expect(spin().attributes('tabindex')).toBe('-1');
  });
});

describe('Stepper accessibility (axe)', () => {
  it.each([
    ['normal', { modelValue: 60, min: 0, max: 200, step: 2.5, unit: 'kg' }],
    ['no bounds or unit', { modelValue: 8 }],
    ['at minimum', { modelValue: 1, min: 1, max: 30 }],
    ['at maximum', { modelValue: 30, min: 1, max: 30 }],
    ['disabled', { modelValue: 60, disabled: true, unit: 'kg' }],
    ['after pressing', { modelValue: 60, unit: 'kg' }],
  ])('has no violations: %s', async (name, props) => {
    setup(props);
    if (name === 'after pressing') await plus().trigger('click');
    await expectNoA11yViolations(wrapper.element);
  });
});
