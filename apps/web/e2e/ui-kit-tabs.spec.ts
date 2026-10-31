import { expect, test } from '@playwright/test';

const demo = '[data-testid="theme-light"] [data-demo="Tabs"]';

test.use({ viewport: { width: 360, height: 800 } });

test('long labels wrap inside the tab list instead of being clipped', async ({ page }) => {
  await page.goto('/dev/ui');
  const list = page.locator(`${demo} [role="tablist"]`).first();
  await expect(list).toBeVisible();
  const { listWidth, scrollWidth, outside } = await list.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return {
      listWidth: box.width,
      scrollWidth: el.scrollWidth,
      outside: [...el.querySelectorAll('[role="tab"]')].filter((tab) => {
        const r = tab.getBoundingClientRect();
        return r.left < box.left - 0.5 || r.right > box.right + 0.5;
      }).length,
    };
  });
  expect(scrollWidth).toBeLessThanOrEqual(listWidth);
  expect(outside).toBe(0);
});
