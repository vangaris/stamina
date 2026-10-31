import { describe, expect, it } from 'vitest';
import { scrubBreadcrumb } from './scrub-breadcrumb.ts';

describe('scrubBreadcrumb', () => {
  it('drops every breadcrumb', () => {
    expect(scrubBreadcrumb()).toBeNull();
  });
});
