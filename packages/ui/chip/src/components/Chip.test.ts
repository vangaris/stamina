import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Chip from './Chip.vue';

describe('Chip', () => {
  it('announces a standalone chip as a pressed/unpressed toggle', () => {
    const off = mount(Chip, { slots: { default: 'Padel' } });
    const on = mount(Chip, { props: { selected: true }, slots: { default: 'Padel' } });
    expect(off.get('button').attributes('aria-pressed')).toBe('false');
    expect(on.get('button').attributes('aria-pressed')).toBe('true');
  });

  it('announces itself as a radio or checkbox when it is one option of a group', () => {
    const radio = mount(Chip, {
      props: { mode: 'radio', selected: true },
      slots: { default: '7' },
    });
    const check = mount(Chip, { props: { mode: 'check' }, slots: { default: 'Nuts' } });
    expect(radio.get('button').attributes()).toMatchObject({
      role: 'radio',
      'aria-checked': 'true',
    });
    expect(check.get('button').attributes()).toMatchObject({
      role: 'checkbox',
      'aria-checked': 'false',
    });
    expect(radio.get('button').attributes('aria-pressed')).toBeUndefined();
  });

  it('emits click, but not when disabled', async () => {
    const wrapper = mount(Chip, { slots: { default: 'Padel' } });
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);

    const disabled = mount(Chip, { props: { disabled: true }, slots: { default: 'Padel' } });
    await disabled.get('button').trigger('click');
    expect(disabled.emitted('click')).toBeUndefined();
  });

  it.each<{ mode: 'toggle' | 'radio' | 'check'; selected: boolean }>([
    { mode: 'toggle', selected: false },
    { mode: 'toggle', selected: true },
    { mode: 'radio', selected: true },
    { mode: 'check', selected: false },
  ])('has no axe violations ($mode, selected=$selected)', async (props) => {
    const wrapper = mount(Chip, { props, slots: { default: 'Padel' } });
    await expectNoA11yViolations(wrapper.element);
  });
});
