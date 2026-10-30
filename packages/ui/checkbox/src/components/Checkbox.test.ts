import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import Checkbox from './Checkbox.vue';

const LABEL = 'Receive training reminders';

/** Text of the elements an input's `aria-describedby` points to, resolved inside its own tree. */
function describedText(wrapper: ReturnType<typeof mountBox>) {
  const ids = (wrapper.get('input').attributes('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean);
  return ids.map((id) => wrapper.element.querySelector(`[id="${id}"]`)?.textContent?.trim());
}

function mountBox(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(Checkbox, {
    props,
    slots: { default: LABEL, ...slots } as never,
    attachTo: document.body,
  });
}

/** Mounts with a real v-model binding so we can read the bound value. */
function mountBound(initial = false) {
  const value = ref(initial);
  const Host = defineComponent({
    setup: () => () =>
      h(
        Checkbox,
        { modelValue: value.value, 'onUpdate:modelValue': (v: boolean) => (value.value = v) },
        () => LABEL,
      ),
  });
  return { wrapper: mount(Host, { attachTo: document.body }), value };
}

describe('Checkbox', () => {
  it('is a checkbox named by its label and is unticked by default', () => {
    const wrapper = mountBox();
    const input = wrapper.get<HTMLInputElement>('input[type="checkbox"]');
    expect(input.element.checked).toBe(false);
    expect(wrapper.get('label').text()).toBe(LABEL);
    // The label wraps the input, so the control's accessible name is the label text.
    expect(input.element.labels?.[0]?.textContent?.trim()).toBe(LABEL);
  });

  it('toggles and updates v-model when the input is clicked', async () => {
    const { wrapper, value } = mountBound();
    const input = wrapper.get('input');
    await input.setValue(true);
    expect(value.value).toBe(true);
    await input.setValue(false);
    expect(value.value).toBe(false);
  });

  it('toggles when the label text is clicked', async () => {
    const { wrapper, value } = mountBound();
    await wrapper.get('label span:last-child').trigger('click');
    expect(value.value).toBe(true);
    expect(wrapper.get<HTMLInputElement>('input').element.checked).toBe(true);
  });

  it('reflects an initially true v-model', () => {
    const { wrapper } = mountBound(true);
    expect(wrapper.get<HTMLInputElement>('input').element.checked).toBe(true);
  });

  it('does not toggle when disabled', async () => {
    const disabled = mountBox({ disabled: true });
    expect(disabled.get('input').attributes('disabled')).toBeDefined();
    disabled.get<HTMLInputElement>('input').element.click();
    await disabled.vm.$nextTick();
    expect(disabled.emitted('update:modelValue')).toBeUndefined();
    expect(disabled.get<HTMLInputElement>('input').element.checked).toBe(false);
  });

  it('exposes the required state', () => {
    const wrapper = mountBox({ required: true });
    expect(wrapper.get<HTMLInputElement>('input').element.required).toBe(true);
    expect(mountBox().get<HTMLInputElement>('input').element.required).toBe(false);
  });

  it('marks the input invalid and exposes the error through its accessible description', () => {
    const wrapper = mountBox({ error: 'You must accept to continue' });
    const input = wrapper.get('input');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(describedText(wrapper)).toContain('You must accept to continue');
    // The message is announced when it appears.
    expect(wrapper.get('[role="alert"]').text()).toBe('You must accept to continue');
  });

  it('is not invalid and has no description when there is no error or description', () => {
    const wrapper = mountBox();
    const input = wrapper.get('input');
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('links the description prop and slot to the input, before the error', () => {
    const prop = mountBox({ description: 'Sent at most once a week', error: 'Required' });
    expect(describedText(prop)).toEqual(['Sent at most once a week', 'Required']);

    const slot = mountBox({}, { description: () => h('em', 'Slot description') });
    expect(describedText(slot)).toEqual(['Slot description']);
  });

  it('keeps the description out of the accessible name', () => {
    const wrapper = mountBox({ description: 'Extra help' });
    expect(wrapper.get('label').text()).toBe(LABEL);
  });

  it('renders rich label content, including a link', () => {
    const wrapper = mountBox(
      {},
      {
        default: () => [
          'I consent to processing of my health data. ',
          h('a', { href: '/privacy' }, 'Privacy policy'),
        ],
      },
    );
    expect(wrapper.get('label a').attributes('href')).toBe('/privacy');
    expect(wrapper.get('label').text()).toContain('I consent to processing of my health data.');
  });

  it('gives each instance unique ids when several are on one page', () => {
    const Two = defineComponent({
      setup: () => () => [
        h(Checkbox, { error: 'A' }, () => 'One'),
        h(Checkbox, { error: 'B' }, () => 'Two'),
      ],
    });
    const wrapper = mount(Two);
    const [a, b] = wrapper.findAll('input').map((i) => i.attributes('aria-describedby'));
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it.each([
    { name: 'unchecked', props: {} },
    { name: 'checked', props: { modelValue: true } },
    { name: 'disabled', props: { disabled: true } },
    { name: 'disabled and checked', props: { disabled: true, modelValue: true } },
    { name: 'required', props: { required: true } },
    { name: 'error', props: { error: 'You must accept to continue' } },
    { name: 'description', props: { description: 'Sent at most once a week' } },
  ])('has no axe violations ($name)', async ({ props }) => {
    const wrapper = mountBox(props);
    await expectNoA11yViolations(wrapper.element);
  });
});
