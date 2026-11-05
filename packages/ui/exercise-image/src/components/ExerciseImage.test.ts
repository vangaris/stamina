import { expectNoA11yViolations } from '@stamina/ui-test';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { ExerciseImageProps } from '../types.ts';
import ExerciseImage from './ExerciseImage.vue';

const props: ExerciseImageProps = {
  src: 'https://wger.de/media/exercise-images/1/push-up.png',
  alt: 'A person in the lowered position of a push-up',
  author: 'Jane Doe',
  authorUrl: 'https://example.org/jane',
  licence: 'CC-BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://wger.de/en/exercise/1/view/',
  authorLabel: 'Image by',
  sourceLabel: 'Source: wger',
  newTabLabel: 'opens in a new tab',
  unavailableLabel: 'Image unavailable',
};

const mountImage = (overrides: Partial<ExerciseImageProps> = {}) =>
  mount(ExerciseImage, { props: { ...props, ...overrides }, attachTo: document.body });

describe('ExerciseImage', () => {
  it('shows the image unmodified, with its alt text, loaded lazily and without a referrer', () => {
    const wrapper = mountImage();
    const img = wrapper.get('img');
    expect(img.attributes('src')).toBe(props.src);
    expect(img.attributes('alt')).toBe(props.alt);
    expect(img.attributes('loading')).toBe('lazy');
    expect(img.attributes('referrerpolicy')).toBe('no-referrer');
    wrapper.unmount();
  });

  it('shows the author, licence and source as links that leave the app safely', () => {
    const wrapper = mountImage();
    const links = wrapper.findAll('a');
    expect(links.map((a) => a.attributes('href'))).toEqual([
      props.authorUrl,
      props.licenceUrl,
      props.sourceUrl,
    ]);
    expect(links.map((a) => a.text())).toEqual([
      expect.stringContaining('Jane Doe'),
      expect.stringContaining('CC-BY-SA 4.0'),
      expect.stringContaining('Source: wger'),
    ]);
    for (const link of links) {
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toContain('noopener');
      expect(link.attributes('rel')).toContain('noreferrer');
      expect(link.text()).toContain('opens in a new tab');
    }
    expect(wrapper.get('figcaption').text()).toContain('Image by');
    wrapper.unmount();
  });

  it('shows the author as plain text when wger gives no author page', () => {
    const wrapper = mountImage({ authorUrl: null });
    expect(wrapper.findAll('a')).toHaveLength(2);
    expect(wrapper.get('figcaption').text()).toContain('Image by Jane Doe');
    wrapper.unmount();
  });

  it('is a figure with the attribution as its caption', () => {
    const wrapper = mountImage();
    expect(wrapper.element.tagName).toBe('FIGURE');
    expect(wrapper.element.querySelector('figcaption')).not.toBeNull();
    wrapper.unmount();
  });

  it('replaces the image with the unavailable text when it fails, and keeps the attribution in place', async () => {
    const wrapper = mountImage();
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('Image unavailable');
    expect(wrapper.findAll('a')).toHaveLength(3);
    wrapper.unmount();
  });

  it('tries again when it is given another image', async () => {
    const wrapper = mountImage();
    await wrapper.get('img').trigger('error');
    await wrapper.setProps({ src: 'https://wger.de/media/exercise-images/2/squat.png' });
    expect(wrapper.get('img').attributes('src')).toBe(
      'https://wger.de/media/exercise-images/2/squat.png',
    );
    expect(wrapper.find('figcaption').exists()).toBe(true);
    wrapper.unmount();
  });

  it('has no axe violations with an author link', async () => {
    const wrapper = mountImage();
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  it('has no axe violations with a plain-text author', async () => {
    const wrapper = mountImage({ authorUrl: null });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  it('has no axe violations when the image is unavailable', async () => {
    const wrapper = mountImage();
    await wrapper.get('img').trigger('error');
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });
});
