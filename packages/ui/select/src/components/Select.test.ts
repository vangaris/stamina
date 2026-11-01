import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import Select from './Select.vue';

const OPTIONS = [
  { value: 'GR', label: 'Greece' },
  { value: 'PT', label: 'Portugal' },
  { value: 'XX', label: 'Closed', disabled: true },
];

// Attached to the document (ids resolve there), so each test unmounts what it mounted.
const mounted: Array<{ unmount: () => void }> = [];
function mountSelect(props: Record<string, unknown> = {}) {
  const wrapper = mount(Select, {
    props: { label: 'Country', options: OPTIONS, placeholder: 'Choose a country', ...props },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

describe('Select', () => {
  it('is a native select named by its visible label', () => {
    const wrapper = mountSelect();
    const select = wrapper.get<HTMLSelectElement>('select');
    expect(select.element.labels?.[0]?.textContent).toContain('Country');
  });

  it('starts on the placeholder, which cannot be picked again', () => {
    const wrapper = mountSelect();
    const select = wrapper.get<HTMLSelectElement>('select').element;
    expect(select.value).toBe('');
    expect(select.options[0]?.textContent).toBe('Choose a country');
    expect(select.options[0]?.disabled).toBe(true);
  });

  it('shows the value from the parent and follows later changes', async () => {
    const wrapper = mountSelect({ modelValue: 'GR' });
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('GR');

    await wrapper.setProps({ modelValue: 'PT' });
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('PT');
  });

  it('emits the chosen value', async () => {
    const wrapper = mountSelect();
    await wrapper.get('select').setValue('PT');
    expect(wrapper.emitted('update:modelValue')).toEqual([['PT']]);
  });

  it('does not offer a disabled option for choosing', () => {
    const select = mountSelect().get<HTMLSelectElement>('select').element;
    expect(select.options[3]?.disabled).toBe(true);
  });

  it('describes the field by its hint and error, and marks it invalid', () => {
    const wrapper = mountSelect({ hint: 'Where you live', error: 'Choose your country' });
    const select = wrapper.get('select');
    const text = (select.attributes('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .join(' | ');
    expect(select.attributes('aria-invalid')).toBe('true');
    expect(text).toContain('Where you live');
    expect(text).toContain('Choose your country');
  });

  it('announces an error that appears later, inside a live region already in the page', async () => {
    const wrapper = mountSelect();
    const region = wrapper.get('[aria-live]');
    await wrapper.setProps({ error: 'Choose your country' });
    expect(wrapper.get('[aria-live]').element).toBe(region.element);
    expect(region.text()).toBe('Choose your country');
  });

  it('has no description or invalid state without a hint or error', () => {
    const select = mountSelect().get('select');
    expect(select.attributes('aria-describedby')).toBeUndefined();
    expect(select.attributes('aria-invalid')).toBeUndefined();
  });

  it('marks a required field and can be disabled', () => {
    const wrapper = mountSelect({ required: true, disabled: true });
    const select = wrapper.get<HTMLSelectElement>('select').element;
    expect(select.required).toBe(true);
    expect(select.disabled).toBe(true);
    expect(wrapper.get('label span').attributes('aria-hidden')).toBe('true');
  });

  it('has no accessibility violations plain, with an error, and disabled', async () => {
    for (const props of [
      {},
      { error: 'Choose your country', hint: 'Where you live' },
      { disabled: true },
    ]) {
      const wrapper = mountSelect(props);
      await expectNoA11yViolations(wrapper.element);
    }
  });
});
