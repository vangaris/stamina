import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import Tabs from './Tabs.vue';
import type { TabsItem } from '../types.ts';

const items: TabsItem[] = [
  { id: 'today', label: 'Today' },
  { id: 'meals', label: 'Meals' },
  { id: 'targets', label: 'Targets', disabled: true },
  { id: 'history', label: 'History' },
];

const slots = {
  today: '<p>Padel at 18:00</p>',
  meals: '<p>Greek yoghurt, oats</p>',
  targets: '<p>Protein 140 g</p>',
  history: '<p>Last week</p>',
};

let wrapper: VueWrapper | undefined;
afterEach(() => wrapper?.unmount());

function mountTabs(modelValue = 'today', tabItems: TabsItem[] = items) {
  const w = mount(Tabs, {
    attachTo: document.body,
    props: {
      items: tabItems,
      label: 'Plan',
      modelValue,
      'onUpdate:modelValue': (value: string) => w.setProps({ modelValue: value }),
    },
    slots,
  });
  wrapper = w;
  return w;
}

const tabs = (w: VueWrapper) => w.findAll<HTMLButtonElement>('[role="tab"]');
const selected = (w: VueWrapper) =>
  tabs(w)
    .filter((t) => t.attributes('aria-selected') === 'true')
    .map((t) => t.text());

describe('Tabs', () => {
  it('exposes a named tab list of tabs, with the active one selected', () => {
    const w = mountTabs('meals');
    expect(w.get('[role="tablist"]').attributes('aria-label')).toBe('Plan');
    expect(tabs(w).map((t) => t.text())).toEqual(['Today', 'Meals', 'Targets', 'History']);
    expect(selected(w)).toEqual(['Meals']);
  });

  it('shows only the active tab’s panel content', async () => {
    const w = mountTabs('today');
    expect(w.text()).toContain('Padel at 18:00');
    expect(w.text()).not.toContain('Greek yoghurt');
    await tabs(w)[1]!.trigger('click');
    expect(w.text()).toContain('Greek yoghurt');
    expect(w.text()).not.toContain('Padel at 18:00');
  });

  it('selects a tab on click and updates the v-model', async () => {
    const w = mountTabs('today');
    await tabs(w)[1]!.trigger('click');
    expect(w.emitted('update:modelValue')).toEqual([['meals']]);
    expect(selected(w)).toEqual(['Meals']);
  });

  it('does not select a disabled tab', async () => {
    const w = mountTabs('today');
    const disabled = tabs(w)[2]!;
    expect(disabled.attributes('disabled')).toBeDefined();
    await disabled.trigger('click');
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(selected(w)).toEqual(['Today']);
  });

  it('keeps exactly one tab in the tab order: the active one', async () => {
    const w = mountTabs('meals');
    const order = () =>
      tabs(w)
        .filter((t) => t.attributes('tabindex') === '0')
        .map((t) => t.text());
    expect(order()).toEqual(['Meals']);
    await tabs(w)[3]!.trigger('click');
    expect(order()).toEqual(['History']);
  });

  it('falls back to the first enabled tab in the tab order when the value matches nothing', () => {
    const w = mountTabs('nope', [{ id: 'a', label: 'A', disabled: true }, ...items.slice(0, 2)]);
    expect(
      tabs(w)
        .filter((t) => t.attributes('tabindex') === '0')
        .map((t) => t.text()),
    ).toEqual(['Today']);
  });

  it('moves selection and focus with ArrowRight / ArrowLeft, skipping disabled tabs', async () => {
    const w = mountTabs('meals');
    tabs(w)[1]!.element.focus();
    await tabs(w)[1]!.trigger('keydown', { key: 'ArrowRight' });
    expect(selected(w)).toEqual(['History']);
    expect(document.activeElement).toBe(tabs(w)[3]!.element);

    await tabs(w)[3]!.trigger('keydown', { key: 'ArrowLeft' });
    expect(selected(w)).toEqual(['Meals']);
    expect(document.activeElement).toBe(tabs(w)[1]!.element);
  });

  it('wraps around at both ends', async () => {
    const w = mountTabs('history');
    tabs(w)[3]!.element.focus();
    await tabs(w)[3]!.trigger('keydown', { key: 'ArrowRight' });
    expect(selected(w)).toEqual(['Today']);
    expect(document.activeElement).toBe(tabs(w)[0]!.element);

    await tabs(w)[0]!.trigger('keydown', { key: 'ArrowLeft' });
    expect(selected(w)).toEqual(['History']);
    expect(document.activeElement).toBe(tabs(w)[3]!.element);
  });

  it('jumps to the first / last enabled tab with Home / End', async () => {
    const w = mountTabs('meals', [
      ...items.slice(0, 3),
      { id: 'last', label: 'Last', disabled: true },
    ]);
    tabs(w)[1]!.element.focus();
    await tabs(w)[1]!.trigger('keydown', { key: 'End' });
    expect(selected(w)).toEqual(['Meals']); // Targets and Last are disabled, so Meals is last
    await tabs(w)[1]!.trigger('keydown', { key: 'Home' });
    expect(selected(w)).toEqual(['Today']);
    expect(document.activeElement).toBe(tabs(w)[0]!.element);
  });

  it('ignores keys that are not part of the pattern and modified arrows', async () => {
    const w = mountTabs('today');
    tabs(w)[0]!.element.focus();
    await tabs(w)[0]!.trigger('keydown', { key: 'ArrowDown' });
    await tabs(w)[0]!.trigger('keydown', { key: 'ArrowRight', altKey: true });
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('links every tab to an existing panel and back', () => {
    const w = mountTabs('today');
    const root = w.element.ownerDocument;
    for (const tab of tabs(w)) {
      const panel = root.getElementById(tab.attributes('aria-controls')!);
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.attributes('id'));
    }
  });

  it('hides inactive panels from assistive technology', () => {
    const w = mountTabs('today');
    const panels = w.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(items.length);
    expect(panels.filter((p) => p.attributes('hidden') === undefined)).toHaveLength(1);
    expect(w.get('[role="tabpanel"]:not([hidden])').attributes('aria-labelledby')).toBe(
      tabs(w)[0]!.attributes('id'),
    );
  });

  it('makes the panel reachable by Tab only when it has nothing focusable inside', async () => {
    const w = mount(Tabs, {
      attachTo: document.body,
      props: { items: items.slice(0, 2), label: 'Plan', modelValue: 'today' },
      slots: { today: '<p>Text only</p>', meals: '<button type="button">Log meal</button>' },
    });
    wrapper = w;
    await new Promise((resolve) => setTimeout(resolve));
    expect(w.get('[role="tabpanel"]:not([hidden])').attributes('tabindex')).toBe('0');

    await w.setProps({ modelValue: 'meals' });
    await new Promise((resolve) => setTimeout(resolve));
    expect(w.get('[role="tabpanel"]:not([hidden])').attributes('tabindex')).toBeUndefined();
  });

  it('gives two instances in one app different ids', () => {
    const Two = defineComponent({
      components: { Tabs },
      setup: () => ({ items, a: ref('today'), b: ref('today') }),
      template:
        '<Tabs v-model="a" :items="items" label="A" /><Tabs v-model="b" :items="items" label="B" />',
    });
    const w = mount(Two, { attachTo: document.body });
    wrapper = w;
    const ids = w.findAll('[id]').map((el) => el.attributes('id'));
    expect(ids).toHaveLength(items.length * 2 * 2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    { name: 'first tab active', value: 'today' },
    { name: 'last tab active', value: 'history' },
  ])('has no axe violations ($name)', async ({ value }) => {
    const w = mountTabs(value);
    await new Promise((resolve) => setTimeout(resolve));
    await expectNoA11yViolations(w.element);
  });

  it('has no axe violations when the active panel has focusable content', async () => {
    const w = mount(Tabs, {
      attachTo: document.body,
      props: { items: items.slice(0, 2), label: 'Plan', modelValue: 'meals' },
      slots: { meals: '<button type="button">Log meal</button>' },
    });
    wrapper = w;
    await expectNoA11yViolations(w.element);
  });
});
