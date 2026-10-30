import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import Button, { type ButtonVariant } from './Button.vue';

describe('Button', () => {
  it('emits click when pressed', async () => {
    const wrapper = mount(Button, { slots: { default: 'Save' } });
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does nothing when disabled', async () => {
    const wrapper = mount(Button, { props: { disabled: true }, slots: { default: 'Save' } });
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
  });

  it('does not submit a surrounding form unless it is a submit button', async () => {
    let submits = 0;
    const Form = (type?: 'submit') =>
      defineComponent({
        render: () =>
          h('form', { onSubmit: (e: Event) => (e.preventDefault(), submits++) }, [
            h(Button, { ...(type ? { type } : {}) }, () => 'Go'),
          ]),
      });

    await mount(Form(), { attachTo: document.body }).get('button').trigger('click');
    expect(submits).toBe(0);
    await mount(Form('submit'), { attachTo: document.body }).get('button').trigger('click');
    expect(submits).toBe(1);
  });

  it.each<ButtonVariant>(['primary', 'secondary', 'ghost', 'danger'])(
    'has an accessible name and no axe violations as %s',
    async (variant) => {
      const wrapper = mount(Button, { props: { variant }, slots: { default: 'Save' } });
      expect(wrapper.get('button').text()).toBe('Save');
      await expectNoA11yViolations(wrapper.element);
    },
  );
});
