import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ToastRegion, { type ToastItem } from './ToastRegion.vue';

// The real TransitionGroup keeps its wrapper element and attributes; the default stub does not.
const global = { stubs: { TransitionGroup: false } };

function mountRegion(toasts: ToastItem[], position?: 'fixed' | 'absolute') {
  return mount(ToastRegion, {
    attachTo: document.body,
    props: { toasts, dismissLabel: 'Dismiss', ...(position ? { position } : {}) },
    global,
  });
}

const saved: ToastItem = { id: 'a', message: 'Set saved' };

describe('ToastRegion', () => {
  let wrapper: VueWrapper | undefined;
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.useRealTimers();
  });

  describe('live regions', () => {
    it('stays in the DOM as polite and assertive live regions while empty', () => {
      wrapper = mountRegion([]);
      expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite');
      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(wrapper.findAll('button')).toHaveLength(0);
    });

    it('keeps the same live region element when the first toast arrives', async () => {
      wrapper = mountRegion([]);
      const region = wrapper.get('[role="status"]').element;
      await wrapper.setProps({ toasts: [saved] });
      expect(wrapper.get('[role="status"]').element).toBe(region);
      expect(region.textContent).toContain('Set saved');
    });

    it.each<'info' | 'success'>(['info', 'success'])(
      'announces %s toasts politely, not as alerts',
      (tone) => {
        wrapper = mountRegion([{ ...saved, tone }]);
        expect(wrapper.get('[role="status"]').text()).toContain('Set saved');
        expect(wrapper.get('[role="alert"]').text()).toBe('');
      },
    );

    it('announces a toast without a tone as info', () => {
      wrapper = mountRegion([saved]);
      expect(wrapper.get('[role="status"]').text()).toContain('Set saved');
    });

    it('announces danger toasts as alerts, not in the polite region', () => {
      wrapper = mountRegion([{ id: 'e', message: 'Could not save', tone: 'danger' }]);
      expect(wrapper.get('[role="alert"]').text()).toContain('Could not save');
      expect(wrapper.get('[role="status"]').text()).toBe('');
    });

    it('renders one toast per item, in order, each with a named close button', () => {
      wrapper = mountRegion([
        { id: '1', message: 'First' },
        { id: '2', message: 'Second', tone: 'success' },
      ]);
      const text = wrapper.get('[role="status"]').text();
      expect(text.indexOf('First')).toBeLessThan(text.indexOf('Second'));
      const closers = wrapper.findAll('button[aria-label="Dismiss"]');
      expect(closers).toHaveLength(2);
    });
  });

  describe('events', () => {
    it('emits dismiss with the id of the toast whose close button was pressed', async () => {
      wrapper = mountRegion([
        { id: '1', message: 'First' },
        { id: '2', message: 'Second' },
        { id: '3', message: 'Boom', tone: 'danger' },
      ]);
      const closers = wrapper.findAll('button[aria-label="Dismiss"]');
      await closers[1]!.trigger('click');
      await closers[2]!.trigger('click');
      expect(wrapper.emitted('dismiss')).toEqual([['2'], ['3']]);
    });

    it('shows the action only when there is an action label, and emits action with the id', async () => {
      wrapper = mountRegion([
        { id: '1', message: 'No action' },
        { id: '2', message: 'Set deleted', actionLabel: 'Undo' },
        { id: '3', message: 'Sync failed', tone: 'danger', actionLabel: 'Retry' },
      ]);
      expect(wrapper.findAll('button')).toHaveLength(2 + 3);
      await wrapper
        .get('[role="status"]')
        .findAll('button')
        .find((b) => b.text() === 'Undo')!
        .trigger('click');
      await wrapper
        .get('[role="alert"]')
        .findAll('button')
        .find((b) => b.text() === 'Retry')!
        .trigger('click');
      expect(wrapper.emitted('action')).toEqual([['2'], ['3']]);
      expect(wrapper.emitted('dismiss')).toBeUndefined();
    });

    it('does not name the action button like the close button', () => {
      wrapper = mountRegion([{ ...saved, actionLabel: 'Undo' }]);
      const names = wrapper.findAll('button').map((b) => b.attributes('aria-label') ?? b.text());
      expect(names).toEqual(['Undo', 'Dismiss']);
    });

    it('dismisses the toast with Escape while focus is inside it', async () => {
      wrapper = mountRegion([{ ...saved, actionLabel: 'Undo' }]);
      await wrapper.get('button').trigger('keydown', { key: 'Escape' });
      expect(wrapper.emitted('dismiss')).toEqual([['a']]);
    });
  });

  describe('auto-dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('emits dismiss with the id after 5 seconds by default', () => {
      wrapper = mountRegion([saved]);
      vi.advanceTimersByTime(4999);
      expect(wrapper.emitted('dismiss')).toBeUndefined();
      vi.advanceTimersByTime(1);
      expect(wrapper.emitted('dismiss')).toEqual([['a']]);
    });

    it('uses the toast durationMs', () => {
      wrapper = mountRegion([{ ...saved, durationMs: 1500 }]);
      vi.advanceTimersByTime(1499);
      expect(wrapper.emitted('dismiss')).toBeUndefined();
      vi.advanceTimersByTime(1);
      expect(wrapper.emitted('dismiss')).toEqual([['a']]);
    });

    it('times each toast independently', async () => {
      wrapper = mountRegion([{ id: 'a', message: 'First', durationMs: 1000 }]);
      vi.advanceTimersByTime(600);
      await wrapper.setProps({
        toasts: [
          { id: 'a', message: 'First', durationMs: 1000 },
          { id: 'b', message: 'Second', durationMs: 1000 },
        ],
      });
      vi.advanceTimersByTime(400);
      expect(wrapper.emitted('dismiss')).toEqual([['a']]);
      vi.advanceTimersByTime(600);
      expect(wrapper.emitted('dismiss')).toEqual([['a'], ['b']]);
    });

    it('never dismisses a persistent toast (durationMs null)', () => {
      wrapper = mountRegion([{ ...saved, durationMs: null }]);
      vi.advanceTimersByTime(10 * 60_000);
      expect(wrapper.emitted('dismiss')).toBeUndefined();
    });

    it('keeps danger toasts until closed by default, but honours an explicit duration', () => {
      wrapper = mountRegion([
        { id: 'e', message: 'Could not save', tone: 'danger' },
        { id: 'f', message: 'Sync failed', tone: 'danger', durationMs: 2000 },
      ]);
      vi.advanceTimersByTime(60_000);
      expect(wrapper.emitted('dismiss')).toEqual([['f']]);
    });

    it('stops the timer when the toast is removed', async () => {
      wrapper = mountRegion([saved]);
      vi.advanceTimersByTime(3000);
      await wrapper.setProps({ toasts: [] });
      vi.advanceTimersByTime(10_000);
      expect(wrapper.emitted('dismiss')).toBeUndefined();
    });

    describe('while the user is reading it', () => {
      it('pauses while hovered and starts the full duration again on leave', async () => {
        wrapper = mountRegion([saved]);
        const toast = wrapper.get('[role="status"] > div');
        vi.advanceTimersByTime(4000);
        await toast.trigger('pointerenter', { pointerType: 'mouse' });
        vi.advanceTimersByTime(60_000);
        expect(wrapper.emitted('dismiss')).toBeUndefined();

        await toast.trigger('pointerleave', { pointerType: 'mouse' });
        vi.advanceTimersByTime(4999);
        expect(wrapper.emitted('dismiss')).toBeUndefined();
        vi.advanceTimersByTime(1);
        expect(wrapper.emitted('dismiss')).toEqual([['a']]);
      });

      it('pauses while focus is inside and starts the full duration again on blur', async () => {
        wrapper = mountRegion([{ ...saved, actionLabel: 'Undo' }]);
        const [action, close] = wrapper.findAll('button');
        vi.advanceTimersByTime(4000);
        action!.element.focus();
        vi.advanceTimersByTime(60_000);
        expect(wrapper.emitted('dismiss')).toBeUndefined();

        // Moving between the toast's own controls does not resume the countdown.
        close!.element.focus();
        vi.advanceTimersByTime(60_000);
        expect(wrapper.emitted('dismiss')).toBeUndefined();

        close!.element.blur();
        vi.advanceTimersByTime(4999);
        expect(wrapper.emitted('dismiss')).toBeUndefined();
        vi.advanceTimersByTime(1);
        expect(wrapper.emitted('dismiss')).toEqual([['a']]);
      });

      it('stays paused until both hover and focus are gone', async () => {
        wrapper = mountRegion([{ ...saved, actionLabel: 'Undo' }]);
        const toast = wrapper.get('[role="status"] > div');
        const action = wrapper.get('button');
        await toast.trigger('pointerenter', { pointerType: 'mouse' });
        action.element.focus();
        await toast.trigger('pointerleave', { pointerType: 'mouse' });
        vi.advanceTimersByTime(60_000);
        expect(wrapper.emitted('dismiss')).toBeUndefined();
        action.element.blur();
        vi.advanceTimersByTime(5000);
        expect(wrapper.emitted('dismiss')).toEqual([['a']]);
      });

      it('does not treat a touch as hovering', async () => {
        wrapper = mountRegion([saved]);
        await wrapper
          .get('[role="status"] > div')
          .trigger('pointerenter', { pointerType: 'touch' });
        vi.advanceTimersByTime(5000);
        expect(wrapper.emitted('dismiss')).toEqual([['a']]);
      });
    });
  });

  describe('accessibility', () => {
    it('has no violations while empty', async () => {
      wrapper = mountRegion([]);
      await expectNoA11yViolations(wrapper.element);
    });

    it.each<'info' | 'success' | 'danger'>(['info', 'success', 'danger'])(
      'has no violations with a %s toast, with and without an action',
      async (tone) => {
        wrapper = mountRegion([
          { id: '1', message: 'Plan updated', tone },
          { id: '2', message: 'Set deleted', tone, actionLabel: 'Undo' },
        ]);
        await expectNoA11yViolations(wrapper.element);
      },
    );

    it('has no violations when absolutely positioned', async () => {
      wrapper = mountRegion([saved], 'absolute');
      await expectNoA11yViolations(wrapper.element);
    });
  });
});
