import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { AriaRole } from '@stamina/a11y';
import { ChipMode } from '../enums/chip-mode.ts';
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
      props: { mode: ChipMode.Radio, selected: true },
      slots: { default: '7' },
    });
    const check = mount(Chip, { props: { mode: ChipMode.Check }, slots: { default: 'Nuts' } });
    expect(radio.get('button').attributes()).toMatchObject({
      role: AriaRole.Radio,
      'aria-checked': 'true',
    });
    expect(check.get('button').attributes()).toMatchObject({
      role: AriaRole.Checkbox,
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

  it.each<{ mode: ChipMode; selected: boolean }>([
    { mode: ChipMode.Toggle, selected: false },
    { mode: ChipMode.Toggle, selected: true },
    { mode: ChipMode.Radio, selected: true },
    { mode: ChipMode.Check, selected: false },
  ])('has no axe violations ($mode, selected=$selected)', async (props) => {
    const wrapper = mount(Chip, { props, slots: { default: 'Padel' } });
    await expectNoA11yViolations(wrapper.element);
  });
});
