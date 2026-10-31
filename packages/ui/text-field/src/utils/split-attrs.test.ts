import { describe, expect, it } from 'vitest';
import { splitAttrs } from './split-attrs.ts';

describe('splitAttrs', () => {
  it('sends class and style to the wrapper only', () => {
    const { wrapper, input } = splitAttrs({ class: 'mt-4', style: { color: 'red' }, maxlength: 4 });
    expect(wrapper).toEqual({ class: 'mt-4', style: { color: 'red' } });
    expect(input).not.toHaveProperty('class');
    expect(input).not.toHaveProperty('style');
  });

  it('sends everything else, listeners included, to the input', () => {
    const onBlur = () => {};
    const { wrapper, input } = splitAttrs({ 'data-testid': 'year', onBlur, spellcheck: false });
    expect(input).toEqual({ 'data-testid': 'year', onBlur, spellcheck: false });
    expect(wrapper).toEqual({ class: undefined, style: undefined });
  });

  it('drops id and aria-describedby from both, since they are merged into the input later', () => {
    const { wrapper, input } = splitAttrs({ id: 'year', 'aria-describedby': 'help' });
    expect(input).toEqual({});
    expect(wrapper).toEqual({ class: undefined, style: undefined });
  });
});
