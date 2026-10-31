import { Key } from '@stamina/a11y';
import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ChipGroup from './ChipGroup.vue';
import type { ChipGroupValue } from '../types.ts';

afterEach(() => wrapper.unmount());

const sports = [
  { value: 'padel', label: 'Padel' },
  { value: 'kite', label: 'Kitesurf', disabled: true },
  { value: 'run', label: 'Running' },
  { value: 'gym', label: 'Gym' },
];

function mountGroup(props: Record<string, unknown> = {}) {
  return mount(ChipGroup, {
    props: {
      options: sports,
      label: 'Sport',
      modelValue: null,
      'onUpdate:modelValue': (v: ChipGroupValue | ChipGroupValue[] | null) => wrapperUpdate(v),
      ...props,
    },
    attachTo: document.body,
  });
}
// Makes v-model two-way so key sequences can chain.
let wrapper: ReturnType<typeof mountGroup>;
function wrapperUpdate(v: ChipGroupValue | ChipGroupValue[] | null) {
  void wrapper.setProps({ modelValue: v });
}
function chips() {
  return wrapper.findAll('button');
}
function emitted() {
  return wrapper.emitted('update:modelValue') ?? [];
}

describe('ChipGroup single', () => {
  it('is a radiogroup named by its label, with radio chips', () => {
    wrapper = mountGroup({ modelValue: 'run' });
    const group = wrapper.get('[role="radiogroup"]');
    const name = document.getElementById(group.attributes('aria-labelledby') ?? '');
    expect(name?.textContent).toBe('Sport');
    expect(chips().map((c) => c.attributes('role'))).toEqual(['radio', 'radio', 'radio', 'radio']);
    expect(chips().map((c) => c.attributes('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
  });

  it('names the group even when the label is visually hidden', () => {
    wrapper = mountGroup({ labelHidden: true });
    const group = wrapper.get('[role="radiogroup"]');
    expect(document.getElementById(group.attributes('aria-labelledby') ?? '')?.textContent).toBe(
      'Sport',
    );
  });

  it('selects on click and ignores clicking the selected or a disabled chip', async () => {
    wrapper = mountGroup();
    await chips()[2]!.trigger('click');
    expect(emitted().at(-1)).toEqual(['run']);
    await chips()[2]!.trigger('click');
    await chips()[1]!.trigger('click');
    expect(emitted()).toHaveLength(1);
    expect(chips()[2]!.attributes('aria-checked')).toBe('true');
  });

  it('clears on clicking the selected chip only with allowDeselect', async () => {
    wrapper = mountGroup({ modelValue: 'run', allowDeselect: true });
    await chips()[2]!.trigger('click');
    expect(emitted().at(-1)).toEqual([null]);
  });

  it('has exactly one tabbable chip: the selected one', () => {
    wrapper = mountGroup({ modelValue: 'run' });
    expect(chips().map((c) => c.attributes('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
  });

  it('makes the first enabled chip tabbable when none, or only a disabled one, is selected', async () => {
    wrapper = mountGroup({ options: [{ ...sports[0]!, disabled: true }, ...sports.slice(2)] });
    expect(chips().map((c) => c.attributes('tabindex'))).toEqual(['-1', '0', '-1']);
    await wrapper.setProps({ modelValue: 'padel' });
    expect(chips().map((c) => c.attributes('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('moves focus and selection with arrows, wrapping and skipping disabled', async () => {
    wrapper = mountGroup({ modelValue: 'padel' });
    chips()[0]!.element.focus();
    await chips()[0]!.trigger('keydown', { key: Key.ArrowRight });
    expect(emitted().at(-1)).toEqual(['run']);
    expect(document.activeElement).toBe(chips()[2]!.element);
    await chips()[2]!.trigger('keydown', { key: Key.ArrowDown });
    await chips()[3]!.trigger('keydown', { key: Key.ArrowRight });
    expect(emitted().at(-1)).toEqual(['padel']);
    expect(document.activeElement).toBe(chips()[0]!.element);
    await chips()[0]!.trigger('keydown', { key: Key.ArrowLeft });
    expect(emitted().at(-1)).toEqual(['gym']);
    await chips()[3]!.trigger('keydown', { key: Key.ArrowUp });
    expect(emitted().at(-1)).toEqual(['run']);
  });

  it('jumps to the first and last enabled chip with Home and End', async () => {
    wrapper = mountGroup({
      options: [{ ...sports[0]!, disabled: true }, ...sports.slice(1)],
      modelValue: 'run',
    });
    chips()[2]!.element.focus();
    await chips()[2]!.trigger('keydown', { key: Key.End });
    expect(emitted().at(-1)).toEqual(['gym']);
    await chips()[3]!.trigger('keydown', { key: Key.Home });
    expect(emitted().at(-1)).toEqual(['run']);
    expect(document.activeElement).toBe(chips()[2]!.element);
  });

  it('supports numeric values (RPE)', async () => {
    wrapper = mountGroup({
      label: 'RPE',
      options: Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    });
    await chips()[6]!.trigger('click');
    expect(emitted().at(-1)).toEqual([7]);
  });

  it.each([
    ['empty', {}],
    ['with selection', { modelValue: 'run' }],
    ['with disabled and hidden label', { modelValue: 'padel', labelHidden: true }],
  ])('has no axe violations (%s)', async (_name, props) => {
    wrapper = mountGroup(props);
    await expectNoA11yViolations(wrapper.element);
  });
});

describe('ChipGroup multiple', () => {
  const allergens = [
    { value: 'nuts', label: 'Nuts' },
    { value: 'milk', label: 'Milk' },
    { value: 'eggs', label: 'Eggs', disabled: true },
    { value: 'soy', label: 'Soy' },
  ];

  it('is a group of checkbox chips, all in the tab order', () => {
    wrapper = mountGroup({
      options: allergens,
      label: 'Allergens',
      multiple: true,
      modelValue: ['milk'],
    });
    const group = wrapper.get('[role="group"]');
    expect(document.getElementById(group.attributes('aria-labelledby') ?? '')?.textContent).toBe(
      'Allergens',
    );
    expect(chips().map((c) => c.attributes('role'))).toEqual(Array(4).fill('checkbox'));
    expect(chips().map((c) => c.attributes('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(chips().filter((c) => c.attributes('tabindex') === '0')).toHaveLength(4);
  });

  it('toggles values in and out, independent of order', async () => {
    wrapper = mountGroup({ options: allergens, multiple: true, modelValue: [] });
    await chips()[3]!.trigger('click');
    await chips()[0]!.trigger('click');
    expect(emitted().at(-1)).toEqual([['soy', 'nuts']]);
    await chips()[3]!.trigger('click');
    expect(emitted().at(-1)).toEqual([['nuts']]);
    expect(chips()[0]!.attributes('aria-checked')).toBe('true');
    expect(chips()[3]!.attributes('aria-checked')).toBe('false');
  });

  it('does not toggle disabled options, and arrows do not change selection', async () => {
    wrapper = mountGroup({ options: allergens, multiple: true, modelValue: [] });
    await chips()[2]!.trigger('click');
    await chips()[0]!.trigger('keydown', { key: Key.ArrowRight });
    expect(emitted()).toHaveLength(0);
  });

  it.each([
    ['empty', {}],
    ['with selection', { modelValue: ['nuts', 'soy'] }],
  ])('has no axe violations (%s)', async (_name, props) => {
    wrapper = mountGroup({ options: allergens, label: 'Allergens', multiple: true, ...props });
    await expectNoA11yViolations(wrapper.element);
  });
});
