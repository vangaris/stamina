import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Sheet is a native modal <dialog>. jsdom has neither focus management nor layout, so the things
 * that matter (trap, focus return, scroll lock, position at the bottom, theme inside the top
 * layer, contrast of the open sheet) are proven here against the dev page in Chromium.
 */
const THEMES = ['light', 'dark'] as const;

async function setup(page: Page, theme: (typeof THEMES)[number]) {
  await page.goto('/dev/ui');
  const demo = page.locator(`[data-testid="theme-${theme}"] [data-demo="Sheet"]`);
  await expect(demo).toBeVisible();
  const opener = demo.getByRole('button', { name: 'Open sheet' });
  const sheet = demo.getByRole('dialog', { name: 'I played: padel' });
  // The second child of the dialog is the panel (the first is the scrim).
  const panel = demo.locator('dialog').first().locator(':scope > div').nth(1);
  return { demo, opener, sheet, panel };
}

const focusIsInside = (page: Page, selector: string) =>
  page.evaluate(
    (sel) => document.querySelector(sel)?.contains(document.activeElement) ?? false,
    selector,
  );

for (const theme of THEMES) {
  test.describe(`Sheet, ${theme} theme`, () => {
    const dialogSelector = `[data-testid="theme-${theme}"] [data-demo="Sheet"] dialog`;

    test('is closed until opened, and takes focus when it opens', async ({ page }) => {
      const { opener, sheet } = await setup(page, theme);
      await expect(sheet).toBeHidden();
      await opener.click();
      await expect(sheet).toBeVisible();
      expect(await focusIsInside(page, dialogSelector)).toBe(true);
      // The first focusable element of the sheet is its close button.
      await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused();
    });

    test('Tab and Shift+Tab never leave the sheet', async ({ page }) => {
      const { opener, sheet } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();

      const visited = new Set<string>();
      const snapshot = () =>
        page.evaluate((sel) => {
          const dialog = document.querySelector(sel);
          const active = document.activeElement;
          return {
            inside: !!dialog && !!active && dialog.contains(active),
            label: active
              ? `${active.tagName}:${active.textContent?.trim() ?? ''}:${active.id}`
              : '',
          };
        }, dialogSelector);

      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press(key);
          const { inside, label } = await snapshot();
          expect(inside, `${key} #${i + 1} reached ${label}`).toBe(true);
          visited.add(label);
        }
      }
      // Close, the text field, Save and Cancel: the focus really moved around, it did not just stay put.
      expect(visited.size).toBeGreaterThanOrEqual(4);
    });

    test('Escape closes the sheet and focus returns to the opener', async ({ page }) => {
      const { opener, sheet } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(opener).toBeFocused();
    });

    test('closing with the close button and with Cancel returns focus to the opener', async ({
      page,
    }) => {
      const { opener, sheet } = await setup(page, theme);
      await opener.click();
      await sheet.getByRole('button', { name: 'Close' }).click();
      await expect(sheet).toBeHidden();
      await expect(opener).toBeFocused();

      await opener.click();
      await sheet.getByRole('button', { name: 'Cancel' }).click();
      await expect(sheet).toBeHidden();
      await expect(opener).toBeFocused();
    });

    test('pressing the dimmed area closes it; a confirmation can opt out', async ({ page }) => {
      const { demo, opener, sheet } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();
      await page.mouse.click(8, 8);
      await expect(sheet).toBeHidden();
      await expect(opener).toBeFocused();

      const confirmOpener = demo.getByRole('button', { name: 'Open confirmation' });
      const confirm = demo.getByRole('dialog', { name: 'Skip today’s Session?' });
      await confirmOpener.click();
      await expect(confirm).toBeVisible();
      await page.mouse.click(8, 8);
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Keep it' }).click();
      await expect(confirm).toBeHidden();
      await expect(confirmOpener).toBeFocused();
    });

    test('sits at the bottom of the viewport, no taller than 85% of it, and scrolls inside', async ({
      page,
    }) => {
      const { opener, sheet, panel } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();
      const viewport = page.viewportSize()!;

      // Wait for the slide-in to finish.
      await expect
        .poll(async () =>
          Math.round((await panel.boundingBox())!.y + (await panel.boundingBox())!.height),
        )
        .toBe(viewport.height);
      const box = (await panel.boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(viewport.height * 0.85 + 1);
      expect(box.width).toBeLessThanOrEqual(448);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);

      // The content overflows, so it scrolls inside the sheet and the sheet itself does not grow.
      const scroller = await sheet.evaluate((dialog) => {
        const el = [...dialog.querySelectorAll<HTMLElement>('div')].find(
          (d) => getComputedStyle(d).overflowY === 'auto',
        )!;
        return { client: el.clientHeight, scroll: el.scrollHeight };
      });
      expect(scroller.scroll).toBeGreaterThan(scroller.client);
    });

    test('the page behind does not scroll while open, and scrolls again after', async ({
      page,
    }) => {
      const { opener, sheet, panel } = await setup(page, theme);
      const scrollable = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      expect(scrollable).toBeGreaterThan(200);

      await opener.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => window.scrollY);
      await opener.click();
      await expect(sheet).toBeVisible();
      await expect(panel).toBeVisible();

      // Wheel over the dimmed area, then over the sheet content: neither may move the page.
      await page.mouse.move(8, 8);
      await page.mouse.wheel(0, 600);
      await page.mouse.move(200, 700);
      await page.mouse.wheel(0, 600);
      // The sheet's own content scrolls (a positive signal that the wheel events were handled)...
      const innerScroll = () =>
        sheet.evaluate(
          (dialog) =>
            [...dialog.querySelectorAll<HTMLElement>('div')].find(
              (d) => getComputedStyle(d).overflowY === 'auto',
            )!.scrollTop,
        );
      await expect.poll(innerScroll).toBeGreaterThan(0);
      // ...and the page behind it did not.
      expect(await page.evaluate(() => window.scrollY)).toBe(before);

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
      await page.mouse.move(200, 300);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    });

    test('uses the theme of its container, although it is in the top layer', async ({ page }) => {
      const { demo, opener, sheet, panel } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();
      const [colors, expected] = await Promise.all([
        panel.evaluate((el) => {
          const s = getComputedStyle(el);
          return { background: s.backgroundColor, text: s.color };
        }),
        demo.evaluate((el) => {
          const probe = document.createElement('span');
          probe.style.backgroundColor = 'var(--st-color-surface)';
          probe.style.color = 'var(--st-color-text)';
          el.append(probe);
          const s = getComputedStyle(probe);
          const out = { background: s.backgroundColor, text: s.color };
          probe.remove();
          return out;
        }),
      ]);
      expect(colors).toEqual(expected);
      expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('the open sheet has no axe violations, including colour contrast', async ({ page }) => {
      const { opener, sheet, panel } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();
      const viewport = page.viewportSize()!;
      await expect
        .poll(async () =>
          Math.round((await panel.boundingBox())!.y + (await panel.boundingBox())!.height),
        )
        .toBe(viewport.height);
      const results = await new AxeBuilder({ page }).include(dialogSelector).analyze();
      expect(results.violations).toEqual([]);
    });

    test('everything in the open sheet is at least 44 px and shows a focus indicator', async ({
      page,
    }) => {
      const { opener, sheet } = await setup(page, theme);
      await opener.click();
      await expect(sheet).toBeVisible();
      const small = await sheet.evaluate((dialog) =>
        [...dialog.querySelectorAll<HTMLElement>('button, input')]
          .map((el) => ({ html: el.outerHTML.slice(0, 60), r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
          .map(({ html, r }) => `${html} is ${Math.round(r.width)}x${Math.round(r.height)}`),
      );
      expect(small).toEqual([]);

      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
        const shown = await page.evaluate(() => {
          const s = getComputedStyle(document.activeElement!);
          return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
        });
        expect(shown).toBe(true);
      }
    });
  });
}
