import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { SuggestionCardProps } from '../types.ts';
import SuggestionCard from './SuggestionCard.vue';

const props: SuggestionCardProps = {
  title: 'A suggestion for you',
  change: 'Move your Session from Thu to Fri.',
  reason: 'You played 90 min at a hard effort.',
  acceptLabel: 'Accept',
  declineLabel: 'Keep my plan',
  acceptTestId: 'accept',
  declineTestId: 'decline',
};

function mountCard(overrides: Partial<SuggestionCardProps> = {}) {
  return mount(SuggestionCard, { props: { ...props, ...overrides }, attachTo: document.body });
}

describe('SuggestionCard', () => {
  it('is a region named by its heading, with the change and the reason', () => {
    const wrapper = mountCard();
    const region = wrapper.get('section');
    const heading = wrapper.get('h2');

    expect(region.attributes('aria-labelledby')).toBe(heading.attributes('id'));
    expect(heading.text()).toBe(props.title);
    expect(region.text()).toContain(props.change);
    expect(region.text()).toContain(props.reason);
    wrapper.unmount();
  });

  it('emits accept and decline from the two buttons', async () => {
    const wrapper = mountCard();

    await wrapper.get('[data-testid="accept"]').trigger('click');
    await wrapper.get('[data-testid="decline"]').trigger('click');

    expect(wrapper.emitted('accept')).toHaveLength(1);
    expect(wrapper.emitted('decline')).toHaveLength(1);
    wrapper.unmount();
  });

  it('disables both buttons while a decision is on its way', async () => {
    const wrapper = mountCard({ busy: true });

    expect(wrapper.get('[data-testid="accept"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="decline"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="accept"]').trigger('click');
    expect(wrapper.emitted('accept')).toBeUndefined();
    wrapper.unmount();
  });

  it('shows the note instead of the buttons once decided', () => {
    const wrapper = mountCard({ decidedNote: 'Saved on this phone.' });

    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toBe('Saved on this phone.');
    wrapper.unmount();
  });

  it('offers accept first, then decline, in tab order', () => {
    const wrapper = mountCard();

    const buttons = wrapper.findAll('button');

    expect(buttons.map((button) => button.text())).toEqual(['Accept', 'Keep my plan']);
    wrapper.unmount();
  });

  it.each([
    ['pending', {}],
    ['busy', { busy: true }],
    ['decided', { decidedNote: 'Saved on this phone.' }],
  ])('has no accessibility violations: %s', async (_name, overrides) => {
    const wrapper = mountCard(overrides);
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });
});
