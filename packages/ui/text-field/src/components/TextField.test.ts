import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { TextFieldInputmode } from '../enums/text-field-inputmode.ts';
import { TextFieldType } from '../enums/text-field-type.ts';
import TextField from './TextField.vue';

// Attached so that focus() has an observable effect.
const mounted: Array<{ unmount: () => void }> = [];
function mountField(options: Parameters<typeof mount<typeof TextField>>[1]) {
  const wrapper = mount(TextField, { attachTo: document.body, ...options });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
});

/** The accessible description: the text of every element `aria-describedby` points at. */
function description(input: HTMLInputElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' | ');
}

describe('TextField', () => {
  it('is named by its visible label', () => {
    const wrapper = mountField({ props: { label: 'Birth year' } });
    const input = wrapper.get('input').element;
    const label = wrapper.get('label');
    expect(label.attributes('for')).toBe(input.id);
    expect(input.labels?.[0]?.textContent).toContain('Birth year');
  });

  it('does not use the placeholder as the name', () => {
    const wrapper = mountField({ props: { label: 'E-mail', placeholder: 'name@example.com' } });
    expect(wrapper.get('input').element.labels?.[0]?.textContent).toContain('E-mail');
    expect(wrapper.get('input').attributes('placeholder')).toBe('name@example.com');
  });

  it('gives two fields on one page different ids so each label points at its own input', () => {
    const both = mount(
      defineComponent({
        render: () => h('div', [h(TextField, { label: 'A' }), h(TextField, { label: 'B' })]),
      }),
      { attachTo: document.body },
    );
    mounted.push(both);
    const [a, b] = both.findAll('input');
    expect(a?.element.id).not.toBe(b?.element.id);
    for (const input of [a, b]) {
      expect(input?.element.labels).toHaveLength(1);
    }
    expect(a?.element.labels?.[0]?.textContent).toContain('A');
    expect(b?.element.labels?.[0]?.textContent).toContain('B');
  });

  describe('v-model', () => {
    it('updates the model as the user types', async () => {
      const wrapper = mountField({ props: { label: 'Sport' } });
      await wrapper.get('input').setValue('Padel');
      expect(wrapper.emitted('update:modelValue')).toEqual([['Padel']]);
    });

    it('shows the value given by the parent and follows later changes', async () => {
      const wrapper = mountField({ props: { label: 'Sport', modelValue: 'Kitesurf' } });
      expect(wrapper.get('input').element.value).toBe('Kitesurf');
      await wrapper.setProps({ modelValue: 'Padel' });
      expect(wrapper.get('input').element.value).toBe('Padel');
    });

    it('works without a parent binding', async () => {
      const wrapper = mountField({ props: { label: 'Sport' } });
      await wrapper.get('input').setValue('Padel');
      expect(wrapper.get('input').element.value).toBe('Padel');
    });
  });

  describe('description', () => {
    it('has none when there is no hint or error', () => {
      const wrapper = mountField({ props: { label: 'Sport' } });
      expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined();
      expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined();
    });

    it('describes the field by its hint', () => {
      const wrapper = mountField({ props: { label: 'Sport', hint: 'Your main sport' } });
      expect(description(wrapper.get('input').element)).toBe('Your main sport');
    });

    it('describes the field by both hint and error', () => {
      const wrapper = mountField({
        props: { label: 'Birth year', hint: 'Four digits', error: 'Enter a year after 1900' },
      });
      const text = description(wrapper.get('input').element);
      expect(text).toContain('Four digits');
      expect(text).toContain('Enter a year after 1900');
    });

    it('reads the suffix unit as part of the description', () => {
      const wrapper = mountField({
        props: { label: 'Weight' },
        slots: { suffix: 'kg' },
      });
      expect(description(wrapper.get('input').element)).toBe('kg');
    });

    it('keeps an aria-describedby passed by the parent', () => {
      const wrapper = mountField({
        props: { label: 'Sport', hint: 'Your main sport' },
        attrs: { 'aria-describedby': 'outside' },
      });
      const ids = wrapper.get('input').attributes('aria-describedby')?.split(' ');
      expect(ids).toContain('outside');
      expect(description(wrapper.get('input').element)).toContain('Your main sport');
    });
  });

  describe('error', () => {
    it('marks the input invalid and shows the message', () => {
      const wrapper = mountField({ props: { label: 'E-mail', error: 'Enter a valid e-mail' } });
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
      expect(wrapper.text()).toContain('Enter a valid e-mail');
    });

    it('is not shown by colour alone: the message comes with a graphic marker', () => {
      const wrapper = mountField({ props: { label: 'E-mail', error: 'Enter a valid e-mail' } });
      const message = wrapper.findAll('p').find((p) => p.text().includes('Enter a valid e-mail'));
      expect(message?.find('svg[aria-hidden="true"]').exists()).toBe(true);
    });

    it('is announced: it appears inside a live region that was already in the page', async () => {
      const wrapper = mountField({ props: { label: 'E-mail' } });
      const region = wrapper.get('[aria-live]');
      expect(region.text()).toBe('');
      await wrapper.setProps({ error: 'Enter a valid e-mail' });
      expect(wrapper.get('[aria-live]').element).toBe(region.element);
      expect(region.text()).toBe('Enter a valid e-mail');
      expect(region.attributes('aria-live')).toBe('polite');
    });

    it('clears invalid state and description when the error is removed', async () => {
      const wrapper = mountField({
        props: { label: 'E-mail', error: 'Enter a valid e-mail', hint: 'We never share it' },
      });
      await wrapper.setProps({ error: '' });
      const input = wrapper.get('input');
      expect(input.attributes('aria-invalid')).toBeUndefined();
      expect(description(input.element)).toBe('We never share it');
      expect(wrapper.text()).not.toContain('Enter a valid e-mail');
    });

    it('treats an empty error string as no error', () => {
      const wrapper = mountField({ props: { label: 'E-mail', error: '' } });
      expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined();
      expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined();
    });
  });

  describe('required and disabled', () => {
    it('exposes required to assistive tech without adding the asterisk to the name', () => {
      const wrapper = mountField({ props: { label: 'E-mail', required: true } });
      const input = wrapper.get('input');
      expect(input.element.required).toBe(true);
      expect(input.element.validity.valueMissing).toBe(true);
      const star = wrapper.get('label span');
      expect(star.attributes('aria-hidden')).toBe('true');
    });

    it('is not required by default', () => {
      const wrapper = mountField({ props: { label: 'Sport' } });
      expect(wrapper.get('input').element.required).toBe(false);
      expect(wrapper.find('label span').exists()).toBe(false);
    });

    it('disables the input so it cannot be typed into or focused', () => {
      const wrapper = mountField({ props: { label: 'Sport', disabled: true } });
      expect(wrapper.get('input').element.disabled).toBe(true);
      wrapper.vm.focus();
      expect(document.activeElement).not.toBe(wrapper.get('input').element);
    });
  });

  describe('attributes', () => {
    it('passes type, inputmode, autocomplete, maxlength, name and placeholder to the input', () => {
      const wrapper = mountField({
        props: {
          label: 'Code',
          type: TextFieldType.Text,
          inputmode: TextFieldInputmode.Numeric,
          autocomplete: 'one-time-code',
          maxlength: 6,
          name: 'code',
          placeholder: '000000',
        },
      });
      expect(wrapper.get('input').attributes()).toMatchObject({
        type: 'text',
        inputmode: 'numeric',
        autocomplete: 'one-time-code',
        maxlength: '6',
        name: 'code',
        placeholder: '000000',
      });
    });

    it('defaults to a text input', () => {
      const wrapper = mountField({ props: { label: 'Sport' } });
      expect(wrapper.get('input').attributes('type')).toBe('text');
    });

    it.each([TextFieldType.Email, TextFieldType.Tel, TextFieldType.Password, TextFieldType.Search])(
      'supports type=%s',
      (type) => {
        const wrapper = mountField({ props: { label: 'Field', type } });
        expect(wrapper.get('input').attributes('type')).toBe(type);
      },
    );

    it('sends undeclared attributes and listeners to the input, not the wrapper', async () => {
      let blurred = 0;
      const wrapper = mountField({
        props: { label: 'Sport' },
        attrs: { 'data-testid': 'sport', enterkeyhint: 'done', onBlur: () => blurred++ },
      });
      const input = wrapper.get('input');
      expect(input.attributes('data-testid')).toBe('sport');
      expect(input.attributes('enterkeyhint')).toBe('done');
      expect(wrapper.element.getAttribute('data-testid')).toBeNull();
      await input.trigger('blur');
      expect(blurred).toBe(1);
    });

    it('keeps class and style on the wrapper for layout', () => {
      const wrapper = mountField({
        props: { label: 'Sport' },
        attrs: { class: 'custom-layout', style: 'margin-top: 4px' },
      });
      expect(wrapper.element.classList.contains('custom-layout')).toBe(true);
      expect(wrapper.element.getAttribute('style')).toContain('margin-top');
      expect(wrapper.get('input').classes()).not.toContain('custom-layout');
    });

    it('uses an id passed by the parent for the input and its label', () => {
      const wrapper = mountField({ props: { label: 'Sport' }, attrs: { id: 'sport-field' } });
      expect(wrapper.get('input').attributes('id')).toBe('sport-field');
      expect(wrapper.get('label').attributes('for')).toBe('sport-field');
    });
  });

  describe('focus()', () => {
    it('moves focus to the input', () => {
      const wrapper = mountField({ props: { label: 'Sport' } });
      wrapper.vm.focus();
      expect(document.activeElement).toBe(wrapper.get('input').element);
    });
  });

  describe('suffix slot', () => {
    it('renders the unit next to the input', () => {
      const wrapper = mountField({ props: { label: 'Weight' }, slots: { suffix: 'kg' } });
      expect(wrapper.text()).toContain('kg');
    });

    it('accepts rich content', () => {
      const wrapper = mountField({
        props: { label: 'Weight' },
        slots: { suffix: () => h('abbr', { title: 'kilograms' }, 'kg') },
      });
      expect(wrapper.find('abbr').text()).toBe('kg');
    });
  });

  describe('accessibility (axe)', () => {
    it.each([
      ['default', { label: 'Sport' }, {}],
      ['with placeholder', { label: 'E-mail', placeholder: 'name@example.com' }, {}],
      ['required', { label: 'E-mail', required: true }, {}],
      ['with hint', { label: 'Sport', hint: 'Your main sport' }, {}],
      ['with error', { label: 'Birth year', error: 'Enter a year after 1900' }, {}],
      [
        'with hint and error',
        { label: 'Birth year', hint: 'Four digits', error: 'Enter a year after 1900' },
        {},
      ],
      ['disabled', { label: 'Sport', disabled: true }, {}],
      ['with suffix', { label: 'Weight', inputmode: TextFieldInputmode.Decimal }, { suffix: 'kg' }],
      [
        'with suffix, hint and error',
        { label: 'Weight', hint: 'Today, in kg', error: 'Enter a weight' },
        { suffix: 'kg' },
      ],
    ] as const)('has no violations (%s)', async (_name, props, slots) => {
      const wrapper = mountField({ props: { ...props }, slots: { ...slots } });
      await expectNoA11yViolations(wrapper.element);
    });
  });
});
