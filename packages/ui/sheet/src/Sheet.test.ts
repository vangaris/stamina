import { expectNoA11yViolations } from '@stamina/ui-test';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import Sheet from './Sheet.vue';

/**
 * jsdom has no <dialog>.showModal(). This stands in for the browser behaviour the component relies
 * on: a modal dialog gets `open`, a `cancel` event on Escape (closing unless prevented) and a
 * `close` event. Focus handling, the trap and layout are proven in Chromium by
 * apps/web/e2e/ui-kit-sheet.spec.ts.
 */
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void };
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const dialog = [...document.querySelectorAll('dialog[open]')].pop() as
      HTMLDialogElement | undefined;
    if (dialog && dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  });
});

enableAutoUnmount(afterEach);
afterEach(() => {
  document.documentElement.style.overflow = '';
});

const baseProps = { title: 'Swap exercise', closeLabel: 'Close' };

function mountSheet(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(Sheet, {
    attachTo: document.body,
    props: { ...baseProps, open: true, ...props },
    slots: { default: '<p>Pick a replacement.</p>', ...slots },
  });
}

/** A parent that owns the open state, like real usage with v-model:open. */
function mountControlled(initial = true, sheetProps: Record<string, unknown> = {}) {
  const open = ref(initial);
  const Parent = defineComponent({
    render: () =>
      h(
        Sheet,
        {
          ...baseProps,
          ...sheetProps,
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
        },
        { default: () => h('p', 'Pick a replacement.') },
      ),
  });
  const wrapper = mount(Parent, { attachTo: document.body });
  return { wrapper, open };
}

const isOpen = (w: { find: (s: string) => { attributes: (n: string) => string | undefined } }) =>
  w.find('dialog').attributes('open') !== undefined;

describe('Sheet', () => {
  it('is closed until open is true, then opens and closes with the model', async () => {
    const { wrapper, open } = mountControlled(false);
    expect(isOpen(wrapper)).toBe(false);
    open.value = true;
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(true);
    open.value = false;
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(false);
  });

  it('opens straight away when mounted with open true', () => {
    expect(isOpen(mountSheet())).toBe(true);
  });

  it('is a dialog named by its title', () => {
    const wrapper = mountSheet({ title: 'Πώς πήγε το παιχνίδι;' });
    const dialog = wrapper.get('dialog');
    const labelledBy = dialog.attributes('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = wrapper.get(`[id="${labelledBy}"]`);
    expect(heading.text()).toBe('Πώς πήγε το παιχνίδι;');
    expect(heading.element.tagName).toBe('H2');
  });

  it('closes from the close button, which is named by closeLabel', async () => {
    const wrapper = mountSheet({ closeLabel: 'Κλείσιμο' });
    const close = wrapper.get('button[aria-label="Κλείσιμο"]');
    await close.trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('closes on Escape', async () => {
    const { wrapper, open } = mountControlled();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(open.value).toBe(false);
    expect(isOpen(wrapper)).toBe(false);
  });

  it('stays open on Escape if the parent refuses the update', async () => {
    const requests: boolean[] = [];
    const Parent = defineComponent({
      render: () =>
        h(Sheet, {
          ...baseProps,
          open: true,
          'onUpdate:open': (v: boolean) => requests.push(v),
        }),
    });
    const wrapper = mount(Parent, { attachTo: document.body });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(requests).toEqual([false]);
    expect(isOpen(wrapper)).toBe(true);
  });

  it('closes when the dimmed area is pressed', async () => {
    const wrapper = mountSheet();
    await wrapper.get('dialog > [aria-hidden="true"]').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('does not close on scrim press when dismissOnScrim is false', async () => {
    const wrapper = mountSheet({ dismissOnScrim: false });
    await wrapper.get('dialog > [aria-hidden="true"]').trigger('click');
    expect(wrapper.emitted('update:open')).toBeUndefined();
  });

  it('does not close when content inside the sheet is pressed', async () => {
    const wrapper = mountSheet();
    await wrapper.get('p').trigger('click');
    await wrapper.get('h2').trigger('click');
    expect(wrapper.emitted('update:open')).toBeUndefined();
  });

  it('renders the default and footer slots; no footer area without a footer slot', () => {
    const withFooter = mountSheet(
      {},
      { default: '<p>Body text</p>', footer: '<button type="button">Save</button>' },
    );
    expect(withFooter.get('p').text()).toBe('Body text');
    expect(withFooter.findAll('button').map((b) => b.text())).toContain('Save');

    const without = mountSheet();
    expect(without.findAll('button')).toHaveLength(1); // only the close button
  });

  it('locks page scrolling while open and restores the previous value after', async () => {
    document.documentElement.style.overflow = 'scroll';
    const { wrapper, open } = mountControlled();
    expect(document.documentElement.style.overflow).toBe('hidden');
    open.value = false;
    await wrapper.vm.$nextTick();
    expect(document.documentElement.style.overflow).toBe('scroll');
  });

  it('keeps the lock until the last of two open sheets closes', async () => {
    const a = mountControlled();
    const b = mountControlled();
    a.open.value = false;
    await a.wrapper.vm.$nextTick();
    expect(document.documentElement.style.overflow).toBe('hidden');
    b.open.value = false;
    await b.wrapper.vm.$nextTick();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('releases the scroll lock when unmounted while open', () => {
    const wrapper = mountSheet();
    expect(document.documentElement.style.overflow).toBe('hidden');
    wrapper.unmount();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('has no axe violations while open, with and without a footer', async () => {
    const plain = mountSheet();
    await expectNoA11yViolations(plain.element);
    plain.unmount();
    const withFooter = mountSheet(
      {},
      { footer: '<button type="button">Save</button><button type="button">Cancel</button>' },
    );
    await expectNoA11yViolations(withFooter.element);
  });
});
