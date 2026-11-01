import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 412, height: 900 } });

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: every tone is legible, 44 px to act on, and stays inside its box`, async ({
    page,
  }) => {
    await page.goto('/dev/ui');
    const demo = page.locator(`[data-testid="theme-${theme}"] [data-demo="Toast"]`);
    await expect(demo).toBeVisible();

    for (const name of ['Info', 'Success', 'Danger', 'With action']) {
      await demo.getByRole('button', { name, exact: true }).click();
    }
    // Stack a long Greek-length message too: text must wrap, never overflow.
    await demo.getByRole('button', { name: 'Stays until closed' }).click();
    await expect(demo.getByRole('button', { name: 'Dismiss' })).toHaveCount(5);
    await expect(demo.getByRole('alert')).toContainText('Could not save your weigh-in');

    // Contrast is measured on the settled toast, not mid-fade.
    await demo.evaluate((root) =>
      Promise.all(root.getAnimations({ subtree: true }).map((a) => a.finished)),
    );

    const results = await new AxeBuilder({ page })
      .include(`[data-testid="theme-${theme}"] [data-demo="Toast"]`)
      .analyze();
    expect(results.violations).toEqual([]);

    const layout = await demo.evaluate((root) => {
      const box = root.querySelector('[data-testid="toast-box"]')!.getBoundingClientRect();
      return [...root.querySelectorAll('[role="status"] > div, [role="alert"] > div')].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          insideX: r.left >= box.left && r.right <= box.right,
          buttons: [...el.querySelectorAll('button')].map((b) => {
            const br = b.getBoundingClientRect();
            return br.width >= 43.5 && br.height >= 43.5;
          }),
        };
      });
    });
    expect(layout.every((t) => t.insideX && t.buttons.every(Boolean))).toBe(true);
  });
}
