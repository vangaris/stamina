import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useActivePanelFocusable } from './useActivePanelFocusable.ts';

/** Two panels: `a` has only text, `b` has `bContent`. Only the active one is visible. */
function setup(bContent: () => ReturnType<typeof h>) {
  const active = ref('a');
  let hasFocusable!: ReturnType<typeof useActivePanelFocusable>;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      hasFocusable = useActivePanelFocusable(root, active);
      return () =>
        h('div', { ref: root }, [
          h(
            'div',
            { role: 'tabpanel', hidden: active.value !== 'a' },
            active.value === 'a' ? 'text' : '',
          ),
          h(
            'div',
            { role: 'tabpanel', hidden: active.value !== 'b' },
            active.value === 'b' ? [bContent()] : '',
          ),
        ]);
    },
  });
  mount(Host, { attachTo: document.body });
  return { active, hasFocusable: () => hasFocusable.value };
}

const tick = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve));
};

describe('useActivePanelFocusable', () => {
  it('is false when the active panel has no focusable content', async () => {
    const s = setup(() => h('button', 'x'));
    await tick();
    expect(s.hasFocusable()).toBe(false);
  });

  it('is true after switching to a panel with a button, false back on a text panel', async () => {
    const s = setup(() => h('button', { type: 'button' }, 'x'));
    await tick();
    s.active.value = 'b';
    await tick();
    expect(s.hasFocusable()).toBe(true);
    s.active.value = 'a';
    await tick();
    expect(s.hasFocusable()).toBe(false);
  });

  it.each([
    ['disabled button', () => h('button', { disabled: true }, 'x')],
    ['hidden input', () => h('input', { type: 'hidden' })],
    ['tabindex -1', () => h('span', { tabindex: -1 }, 'x')],
  ])('ignores a %s', async (_name, content) => {
    const s = setup(content);
    s.active.value = 'b';
    await tick();
    expect(s.hasFocusable()).toBe(false);
  });

  it.each([
    ['link with href', () => h('a', { href: '#x' }, 'x')],
    ['input', () => h('input', { type: 'text' })],
    ['summary', () => h('summary', 'x')],
    ['tabindex 0', () => h('span', { tabindex: 0 }, 'x')],
  ])('detects a %s', async (_name, content) => {
    const s = setup(content);
    s.active.value = 'b';
    await tick();
    expect(s.hasFocusable()).toBe(true);
  });
});
