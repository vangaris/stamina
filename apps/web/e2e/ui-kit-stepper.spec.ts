import { expect, test } from '@playwright/test';

const demo = '[data-testid="theme-light"] [data-demo="Stepper"]';

test.use({ viewport: { width: 360, height: 800 } });

test('the gym buttons are big, and a long Greek value stays inside the row', async ({ page }) => {
  await page.goto('/dev/ui');
  const steppers = page.locator(`${demo} [role="spinbutton"]`);
  await expect(steppers.first()).toBeVisible();

  const buttons = page.locator(`${demo} button:not([disabled])`);
  for (const box of await buttons.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().toJSON()),
  )) {
    expect(box.width).toBeGreaterThanOrEqual(56);
    expect(box.height).toBeGreaterThanOrEqual(56);
  }

  const overflowing = await page.locator(demo).evaluate(
    (root) =>
      [...root.querySelectorAll('[role="spinbutton"]')].filter((el) => {
        const row = el.parentElement!.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return (
          el.scrollWidth > el.clientWidth || r.left < row.left - 0.5 || r.right > row.right + 0.5
        );
      }).length,
  );
  expect(overflowing).toBe(0);
});
