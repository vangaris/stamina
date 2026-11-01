import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The dev-only UI kit page renders every component in both themes. Checks that need real layout
 * and painting live here (jsdom has neither): colour contrast, 44 px tap targets, focus visible,
 * reduced motion. Structure (roles, names, keyboard behaviour) is in each package's own tests.
 */
const THEMES = ['light', 'dark'] as const;

const INTERACTIVE = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

async function openKit(page: Page) {
  await page.goto('/dev/ui');
  await expect(page.getByRole('heading', { name: 'UI kit' })).toBeVisible();
}

test('renders every component in both themes', async ({ page }) => {
  await openKit(page);
  const demos = await page
    .locator('[data-testid="theme-light"] [data-demo]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-demo')));
  expect(demos).toEqual(
    expect.arrayContaining([
      'BottomNav',
      'Button',
      'Card',
      'Checkbox',
      'Chip',
      'ChipGroup',
      'ProgressBar',
      'Sheet',
      'Stepper',
      'Tabs',
      'TextField',
      'Toast',
    ]),
  );
  const dark = await page.locator('[data-testid="theme-dark"] [data-demo]').count();
  expect(dark).toBe(demos.length);
});

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    test('has no axe violations, including colour contrast', async ({ page }) => {
      await openKit(page);
      const results = await new AxeBuilder({ page })
        .include(`[data-testid="theme-${theme}"]`)
        .analyze();
      expect(results.violations).toEqual([]);
    });

    test('every interactive element is at least 44 x 44 px', async ({ page }) => {
      await openKit(page);
      const small = await page
        .locator(`[data-testid="theme-${theme}"]`)
        .evaluate((root, selector) => {
          const out: string[] = [];
          for (const el of root.querySelectorAll<HTMLElement>(selector)) {
            if (el.matches(':disabled, [aria-hidden="true"]')) continue;
            // A control may be small if the label or wrapper that activates it is not.
            const candidates = [el, el.closest<HTMLElement>('label, [data-tap-target]')];
            const visible = candidates.filter((c): c is HTMLElement => c !== null);
            const rects = visible.map((c) => c.getBoundingClientRect());
            if (rects[0]!.width === 0 && rects[0]!.height === 0 && rects.length === 1) continue;
            if (!rects.some((r) => r.width >= 43.5 && r.height >= 43.5)) {
              out.push(
                `${el.outerHTML.slice(0, 80)} is ${Math.round(rects[0]!.width)}x${Math.round(rects[0]!.height)}`,
              );
            }
          }
          return out;
        }, INTERACTIVE);
      expect(small).toEqual([]);
    });

    test('every control shows a visible focus indicator when reached by keyboard', async ({
      page,
    }) => {
      await openKit(page);
      const root = page.locator(`[data-testid="theme-${theme}"]`);
      const expected = await root.locator(INTERACTIVE).evaluateAll(
        (els) =>
          els.filter((el) => {
            const style = getComputedStyle(el);
            return (
              !el.matches(':disabled') && style.visibility !== 'hidden' && style.display !== 'none'
            );
          }).length,
      );
      expect(expected).toBeGreaterThan(0);

      // Start just before the theme container, then Tab through it.
      await root.evaluate((el) => {
        const marker = document.createElement('span');
        marker.tabIndex = 0;
        marker.id = 'kit-start';
        el.before(marker);
        marker.focus();
      });
      const missing: string[] = [];
      for (let i = 0; i < expected; i++) {
        await page.keyboard.press('Tab');
        const result = await page.evaluate((themeSel) => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || !el.closest(themeSel)) return { inside: false as const };
          const s = getComputedStyle(el);
          const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
          const ring = s.boxShadow !== 'none';
          return { inside: true as const, shown: outline || ring, html: el.outerHTML.slice(0, 80) };
        }, `[data-testid="theme-${theme}"]`);
        if (!result.inside) break;
        if (!result.shown) missing.push(result.html);
      }
      await page.evaluate(() => document.getElementById('kit-start')?.remove());
      expect(missing).toEqual([]);
    });
  });
}

test('honours reduced motion: no transition or animation runs longer than a frame', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openKit(page);
  const slow = await page.evaluate(() => {
    const longest = (value: string) =>
      Math.max(
        ...value.split(',').map((v) => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000)),
      );
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('[data-demo], [data-demo] *')) {
      const s = getComputedStyle(el);
      if (longest(s.transitionDuration) > 10 || longest(s.animationDuration) > 10) {
        out.push(el.outerHTML.slice(0, 80));
      }
    }
    return out;
  });
  expect(slow).toEqual([]);
});
