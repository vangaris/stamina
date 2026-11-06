import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * RestTimer is a native modal <dialog> filling the screen. jsdom has no layout, focus trap or
 * top layer, so the full-screen cover, theme inside the top layer, focus handling and contrast of
 * the open state are proven here against the dev page in Chromium.
 */
const THEMES = ['light', 'dark'] as const;

async function setup(page: Page, theme: (typeof THEMES)[number]) {
  await page.goto('/dev/ui');
  const demo = page.locator(`[data-testid="theme-${theme}"] [data-demo="RestTimer"]`);
  await expect(demo).toBeVisible();
  const opener = demo.getByRole('button', { name: 'Start rest' });
  const timer = demo.getByRole('dialog', { name: 'Rest' });
  return { demo, opener, timer };
}

for (const theme of THEMES) {
  test.describe(`RestTimer, ${theme} theme`, () => {
    test('is closed until started, then covers the viewport and focuses Skip', async ({ page }) => {
      const { opener, timer } = await setup(page, theme);
      await expect(timer).toHaveCount(0);
      await opener.click();
      await expect(timer).toBeVisible();
      await expect(timer.getByRole('button', { name: 'Skip rest' })).toBeFocused();
      const box = (await timer.boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(box.x).toBe(0);
      expect(box.y).toBe(0);
      expect(box.width).toBe(viewport.width);
      expect(box.height).toBe(viewport.height);
    });

    test('keeps the theme of its container inside the top layer', async ({ page }) => {
      const { demo, opener, timer } = await setup(page, theme);
      await opener.click();
      await expect(timer).toBeVisible();
      const [dialogBg, containerBg] = await Promise.all([
        timer.evaluate((el) => getComputedStyle(el).backgroundColor),
        demo.evaluate(
          (el) => getComputedStyle(el.closest('[data-testid^="theme-"]')!).backgroundColor,
        ),
      ]);
      expect(dialogBg).toBe(containerBg);
    });

    test('has no axe violations while open, including contrast', async ({ page }) => {
      const { opener, timer } = await setup(page, theme);
      await opener.click();
      await expect(timer).toBeVisible();
      const results = await new AxeBuilder({ page }).include('dialog[open]').analyze();
      expect(results.violations).toEqual([]);
    });

    test('buttons are at least 44 px tall and Tab never leaves the timer', async ({ page }) => {
      const { opener, timer } = await setup(page, theme);
      await opener.click();
      await expect(timer).toBeVisible();
      for (const name of ['Skip rest', '+15 s']) {
        const box = (await timer.getByRole('button', { name }).boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press(key);
          const inside = await timer.evaluate((el) => el.contains(document.activeElement));
          expect(inside, `${key} #${i + 1}`).toBe(true);
        }
      }
    });

    test('+15 s adds time and the countdown moves', async ({ page }) => {
      const { timer, opener } = await setup(page, theme);
      await opener.click();
      const time = timer.getByTestId('rest-timer-time');
      await expect(time).toHaveText(/^1:(2\d|30)$/);
      await timer.getByRole('button', { name: '+15 s' }).click();
      await expect(time).toHaveText(/^1:(4\d|45)$/);
      const before = await time.innerText();
      await expect.poll(() => time.innerText(), { timeout: 10_000 }).not.toBe(before);
    });

    test('Skip and Escape end the rest and return focus to the opener', async ({ page }) => {
      const { demo, opener, timer } = await setup(page, theme);
      await opener.click();
      await timer.getByRole('button', { name: 'Skip rest' }).click();
      await expect(timer).toHaveCount(0);
      await expect(opener).toBeFocused();
      await expect(demo.getByText('Rests ended 1')).toBeVisible();

      await opener.click();
      await expect(timer).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(timer).toHaveCount(0);
      await expect(opener).toBeFocused();
      await expect(demo.getByText('Rests ended 2')).toBeVisible();
    });
  });
}
