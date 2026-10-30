import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Card from './Card.vue';

describe('Card', () => {
  it('renders a div by default', () => {
    const wrapper = mount(Card, { slots: { default: 'Hello' } });
    expect(wrapper.element.tagName).toBe('DIV');
  });

  it.each(['div', 'section', 'article', 'li'] as const)('renders the chosen element: %s', (as) => {
    const wrapper = mount(Card, { props: { as }, slots: { default: 'Hello' } });
    expect(wrapper.element.tagName).toBe(as.toUpperCase());
  });

  it('points a section or article at its heading only when labelledBy is given', () => {
    const labelled = mount(Card, { props: { as: 'section', labelledBy: 'h1' } });
    const bare = mount(Card, { props: { as: 'article' } });
    expect(labelled.attributes('aria-labelledby')).toBe('h1');
    expect(bare.attributes('aria-labelledby')).toBeUndefined();
  });

  it('does not label a plain div or li', () => {
    expect(
      mount(Card, { props: { as: 'div', labelledBy: 'h1' } }).attributes('aria-labelledby'),
    ).toBeUndefined();
    expect(
      mount(Card, { props: { as: 'li', labelledBy: 'h1' } }).attributes('aria-labelledby'),
    ).toBeUndefined();
  });

  it('gives a labelled section the region role named by its heading', () => {
    const wrapper = mount(
      {
        components: { Card },
        template:
          '<Card as="section" labelled-by="t"><template #header><h2 id="t">Load</h2></template>x</Card>',
      },
      { attachTo: document.body },
    );
    const section = wrapper.get('section');
    const heading = wrapper.get('#t');
    expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'));
    wrapper.unmount();
  });

  it('renders header, default and footer slots in that order', () => {
    const wrapper = mount(Card, {
      slots: { footer: '<p>footer</p>', default: '<p>body</p>', header: '<p>header</p>' },
    });
    expect(wrapper.text()).toBe('headerbodyfooter');
  });

  it('leaves no empty wrapper for absent slots', () => {
    const bodyOnly = mount(Card, { slots: { default: 'body' } });
    expect(bodyOnly.element.children).toHaveLength(1);
    const footerOnly = mount(Card, { slots: { footer: 'f' } });
    expect(footerOnly.element.children).toHaveLength(1);
    expect(mount(Card).element.children).toHaveLength(0);
  });

  it('is not interactive itself', () => {
    const wrapper = mount(Card, { slots: { default: 'body' } });
    expect(wrapper.element.hasAttribute('tabindex')).toBe(false);
    expect(wrapper.element.hasAttribute('role')).toBe(false);
  });

  it.each(['default', 'accent', 'load', 'suggest', 'danger'] as const)(
    'has no axe violations (tone %s)',
    async (tone) => {
      const wrapper = mount(
        {
          components: { Card },
          template: `<Card as="section" tone="${tone}" labelled-by="t" padding="lg">
            <template #header><h2 id="t">Move Thursday's session a day?</h2></template>
            <p>You slept 5 h.</p>
            <template #footer><button type="button">Move it</button></template>
          </Card>`,
        },
        { attachTo: document.body },
      );
      await expectNoA11yViolations(wrapper.element);
      wrapper.unmount();
    },
  );

  it('has no axe violations as list items in a list', async () => {
    const wrapper = mount(
      {
        components: { Card },
        template: '<ul><Card as="li">Padel 18:00</Card><Card as="li">Kitesurf 10:00</Card></ul>',
      },
      { attachTo: document.body },
    );
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });
});
