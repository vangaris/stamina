import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import BottomNav from './BottomNav.vue';

const items = [
  { id: 'today', label: 'Today', href: '/today' },
  { id: 'session', label: 'Session', href: '/session' },
  { id: 'meals', label: 'Meals', href: '/meals' },
];

const setup = (activeId = 'today') =>
  mount(BottomNav, { props: { items, activeId, label: 'Main' } });

describe('BottomNav', () => {
  it('is a labelled navigation landmark that marks only the active tab as the current page', () => {
    const wrapper = setup('session');
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Main');
    const current = wrapper.findAll('a').filter((a) => a.attributes('aria-current') === 'page');
    expect(current.map((a) => a.text())).toEqual(['Session']);
  });

  it('emits the tab id instead of following the link', async () => {
    const wrapper = setup();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    wrapper.findAll('a')[2]!.element.dispatchEvent(click);
    expect(wrapper.emitted('select')).toEqual([['meals']]);
    expect(click.defaultPrevented).toBe(true);
  });

  it('has no axe violations', async () => {
    await expectNoA11yViolations(setup().element);
  });
});
